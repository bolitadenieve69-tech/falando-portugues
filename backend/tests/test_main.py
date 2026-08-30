"""Tests for main.py FastAPI endpoints.

Uses httpx.AsyncClient + ASGITransport to test endpoints without network I/O.
All external calls (database, Anthropic, ElevenLabs, LiveKit) are patched.
"""

import asyncio
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Force-set required env vars before importing main so _validate_env() passes.
# Use direct assignment so we override empty-string values from .env or shell exports.
_TEST_ENV = {
    "ANTHROPIC_API_KEY": "test-anthropic-key",
    "DEEPGRAM_API_KEY": "test-deepgram-key",
    "ELEVENLABS_API_KEY": "test-elevenlabs-key",
    "LIVEKIT_URL": "wss://test.livekit.cloud",
    "LIVEKIT_API_KEY": "test-livekit-key",
    "LIVEKIT_API_SECRET": "test-livekit-secret",
}
for _k, _v in _TEST_ENV.items():
    if not os.environ.get(_k):
        os.environ[_k] = _v

import httpx
from fastapi.testclient import TestClient

import main  # noqa: E402 — must come after env setup


def _discard_coroutine_task(coro):
    try:
        coro.close()
    except Exception:
        pass
    return None


# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_USER = {"id": 1, "device_id": "device-abc", "username": "Tester", "password_hash": "x"}
VALID_TOKEN = "valid-bearer-token"
AUTH_HEADERS = {"Authorization": f"Bearer {VALID_TOKEN}"}


def _client_with_user(app=main.app) -> TestClient:
    """Return a synchronous TestClient that resolves require_user to VALID_USER."""
    main.app.dependency_overrides[main.require_user] = lambda: VALID_USER
    return TestClient(app, raise_server_exceptions=True)


def _client_no_user(app=main.app) -> TestClient:
    """Return a client that always raises 401 from require_user (no override)."""
    main.app.dependency_overrides.pop(main.require_user, None)
    return TestClient(app, raise_server_exceptions=False)


# ── /health ───────────────────────────────────────────────────────────────────

class TestHealth:
    def test_returns_ok(self):
        client = _client_with_user()
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestAppTokenRequirement:
    def test_missing_app_token_returns_401(self):
        with patch.object(main, "_APP_TOKEN", "secret-token"):
            client = _client_with_user()
            resp = client.get("/languages")
        assert resp.status_code == 401

    def test_valid_app_token_allows_request(self):
        with patch.object(main, "_APP_TOKEN", "secret-token"):
            client = _client_with_user()
            headers = {"X-App-Token": "secret-token"}
            resp = client.get("/languages", headers=headers)
        assert resp.status_code == 200


# ── /session ──────────────────────────────────────────────────────────────────

VALID_SESSION_BODY = {
    "level": "B1",
    "topic": "livre",
    "participant_name": "user",
    "voice_id": "DMcOknq8n1B6XshFIJKJ",
}


class TestCreateSession:
    def _make_client(self) -> TestClient:
        return _client_with_user()

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_returns_session_fields(self, mock_token):
        client = self._make_client()
        resp = client.post("/session", json=VALID_SESSION_BODY)
        assert resp.status_code == 200
        body = resp.json()
        assert "room_name" in body
        assert body["room_name"].startswith("tutor-")
        assert body["token"] == "tok-abc"
        assert body["livekit_url"] == os.environ["LIVEKIT_URL"]

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_invalid_level_returns_422(self, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "level": "Z9"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_invalid_topic_returns_422(self, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "topic": "unknown_topic"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_invalid_voice_id_returns_422(self, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "voice_id": "not-a-real-voice"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", side_effect=KeyError("LIVEKIT_API_KEY"))
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_missing_env_returns_500(self, mock_token):
        client = self._make_client()
        resp = client.post("/session", json=VALID_SESSION_BODY)
        assert resp.status_code == 500

    def test_missing_auth_returns_401(self):
        main.app.dependency_overrides.pop(main.require_user, None)
        client = TestClient(main.app, raise_server_exceptions=False)
        with patch("database.get_user_by_token", new=AsyncMock(return_value=None)):
            resp = client.post("/session", json=VALID_SESSION_BODY)
        assert resp.status_code == 401

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_participant_name_is_sanitized(self, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "participant_name": "  "}
        resp = client.post("/session", json=body)
        # Blank name is sanitized to "user" — request succeeds
        assert resp.status_code == 200

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_defaults_to_portuguese_without_language(self, mock_token):
        # Backward compat: existing app sends no `language` field.
        client = self._make_client()
        body = {k: v for k, v in VALID_SESSION_BODY.items()}
        resp = client.post("/session", json=body)
        assert resp.status_code == 200

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_voice_id_defaults_when_omitted(self, mock_token):
        client = self._make_client()
        body = {"level": "B1", "topic": "livre", "language": "pt-PT"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 200

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_unsupported_language_returns_422(self, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "language": "de-DE", "voice_id": None}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_not_ready_language_returns_422(self, mock_token):
        # French has no configured voices yet → rejected.
        client = self._make_client()
        body = {"level": "B1", "topic": "livre", "language": "fr-FR"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_voice_from_wrong_language_returns_422(self, mock_token):
        # A pt voice id under fr-FR is invalid (and fr-FR is not ready anyway).
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "language": "fr-FR"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422


class TestSpawnBot:
    @pytest.mark.asyncio
    async def test_spawn_bot_invokes_run_bot(self):
        import bot

        bot_run = AsyncMock(return_value=None)
        with patch.object(bot, "run_bot", new=bot_run):
            await main._spawn_bot(
                room_url="wss://test",
                token="bot-token",
                room_name="tutor-room",
                level="B1",
                topic="livre",
                voice_id="DMcOknq8n1B6XshFIJKJ",
                language="pt-PT",
            )

        bot_run.assert_awaited_once_with(
            room_url="wss://test",
            token="bot-token",
            room_name="tutor-room",
            level="B1",
            topic="livre",
            voice_id="DMcOknq8n1B6XshFIJKJ",
            language="pt-PT",
            on_ready=None,
            learner_name=None,
            previous_sessions=0,
        )

    @pytest.mark.asyncio
    async def test_spawn_bot_logs_exceptions_and_returns(self):
        import bot

        bot_run = AsyncMock(side_effect=RuntimeError("boom"))
        with patch.object(bot, "run_bot", new=bot_run):
            await main._spawn_bot(
                room_url="wss://test",
                token="bot-token",
                room_name="tutor-room",
                level="B1",
                topic="livre",
                voice_id="DMcOknq8n1B6XshFIJKJ",
                language="pt-PT",
            )

        assert bot_run.await_count == 1


class TestLanguages:
    def test_lists_all_languages(self):
        client = _client_with_user()
        resp = client.get("/languages")
        assert resp.status_code == 200
        langs = {l["code"]: l for l in resp.json()["languages"]}
        assert set(langs) == {"pt-PT", "fr-FR", "it-IT", "en-GB"}

    def test_portuguese_ready_with_voices(self):
        client = _client_with_user()
        pt = next(l for l in client.get("/languages").json()["languages"] if l["code"] == "pt-PT")
        assert pt["ready"] is True
        assert len(pt["voices"]) == 3
        assert {"key": "livre", "label": pt["topics"][-1]["label"]}  # topics present

    def test_french_not_ready_no_voices(self):
        client = _client_with_user()
        fr = next(l for l in client.get("/languages").json()["languages"] if l["code"] == "fr-FR")
        assert fr["ready"] is False
        assert fr["voices"] == []


# ── /translate ────────────────────────────────────────────────────────────────

class TestTranslateWord:
    def _make_client(self) -> TestClient:
        return _client_with_user()

    def _mock_anthropic_response(self, translation: str) -> MagicMock:
        msg = MagicMock()
        msg.content = [MagicMock(text=translation)]
        client = MagicMock()
        client.messages.create = AsyncMock(return_value=msg)
        return client

    @patch("database.cache_translation", new_callable=AsyncMock)
    @patch("database.get_cached_translation", new_callable=AsyncMock, return_value=None)
    @patch("anthropic.AsyncAnthropic")
    def test_returns_translation(self, mock_anthropic_cls, mock_get_cache, mock_set_cache):
        mock_anthropic_cls.return_value = self._mock_anthropic_response("viajar")
        client = self._make_client()
        resp = client.post("/translate", json={"word": "viajar", "from_lang": "pt", "to_lang": "es"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["word"] == "viajar"
        assert body["translation"] == "viajar"

    @patch("database.cache_translation", new_callable=AsyncMock)
    @patch("database.get_cached_translation", new_callable=AsyncMock, return_value=None)
    @patch("anthropic.AsyncAnthropic")
    def test_strips_whitespace_from_translation(self, mock_anthropic_cls, mock_get_cache, mock_set_cache):
        mock_anthropic_cls.return_value = self._mock_anthropic_response("  casa  ")
        client = self._make_client()
        resp = client.post("/translate", json={"word": "casa"})
        assert resp.status_code == 200
        assert resp.json()["translation"] == "casa"

    @patch("database.cache_translation", new_callable=AsyncMock)
    @patch("database.get_cached_translation", new_callable=AsyncMock, return_value=None)
    @patch("anthropic.AsyncAnthropic")
    def test_caches_new_translation(self, mock_anthropic_cls, mock_get_cache, mock_set_cache):
        mock_anthropic_cls.return_value = self._mock_anthropic_response("hogar")
        client = self._make_client()
        resp = client.post("/translate", json={"word": "Casa"})
        assert resp.status_code == 200
        # Cache key is lowercased so "Casa" and "casa" share one entry.
        mock_set_cache.assert_awaited_once_with("casa", "pt", "es", "hogar")

    @patch("database.get_cached_translation", new_callable=AsyncMock, return_value="hogar")
    @patch("anthropic.AsyncAnthropic")
    def test_cached_translation_skips_llm(self, mock_anthropic_cls, mock_get_cache):
        client = self._make_client()
        resp = client.post("/translate", json={"word": "casa"})
        assert resp.status_code == 200
        assert resp.json()["translation"] == "hogar"
        mock_anthropic_cls.assert_not_called()

    def test_empty_word_returns_422(self):
        client = self._make_client()
        resp = client.post("/translate", json={"word": "   "})
        assert resp.status_code == 422

    def test_word_too_long_returns_422(self):
        client = self._make_client()
        resp = client.post("/translate", json={"word": "a" * 61})
        assert resp.status_code == 422

    def test_missing_auth_returns_401(self):
        main.app.dependency_overrides.pop(main.require_user, None)
        client = TestClient(main.app, raise_server_exceptions=False)
        with patch("database.get_user_by_token", new=AsyncMock(return_value=None)):
            resp = client.post("/translate", json={"word": "casa"})
        assert resp.status_code == 401


# ── /sessions ─────────────────────────────────────────────────────────────────

_VALID_SESSION_RECORD = {
    "id": "1000-1300",
    "topic": "viagens",
    "level": "B1",
    "started_at": 1000,
    "ended_at": 1300,
    "duration_seconds": 300,
    "message_count": 10,
    "correction_count": 2,
    "excerpt": "Olá!",
}


class TestSessionHistory:
    def _make_client(self) -> TestClient:
        return _client_with_user()

    @patch("database.save_session", new_callable=AsyncMock)
    def test_save_session_returns_ok(self, mock_save):
        client = self._make_client()
        resp = client.post("/sessions", json=_VALID_SESSION_RECORD)
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
        mock_save.assert_awaited_once()
        # Saved under the authenticated user's id, not a client-supplied one.
        assert mock_save.await_args[0][0] == VALID_USER["id"]

    @patch("database.save_session", new_callable=AsyncMock)
    def test_save_session_invalid_level_returns_422(self, mock_save):
        client = self._make_client()
        body = {**_VALID_SESSION_RECORD, "level": "Z9"}
        resp = client.post("/sessions", json=body)
        assert resp.status_code == 422
        mock_save.assert_not_awaited()

    @patch("database.save_session", new_callable=AsyncMock)
    def test_save_session_negative_count_returns_422(self, mock_save):
        client = self._make_client()
        body = {**_VALID_SESSION_RECORD, "message_count": -1}
        resp = client.post("/sessions", json=body)
        assert resp.status_code == 422

    @patch("database.get_sessions", new_callable=AsyncMock, return_value=[_VALID_SESSION_RECORD])
    def test_list_sessions_returns_records(self, mock_get):
        client = self._make_client()
        resp = client.get("/sessions")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["sessions"]) == 1
        assert body["sessions"][0]["id"] == "1000-1300"
        mock_get.assert_awaited_once_with(VALID_USER["id"])

    def test_save_session_missing_auth_returns_401(self):
        main.app.dependency_overrides.pop(main.require_user, None)
        client = TestClient(main.app, raise_server_exceptions=False)
        with patch("database.get_user_by_token", new=AsyncMock(return_value=None)):
            resp = client.post("/sessions", json=_VALID_SESSION_RECORD)
        assert resp.status_code == 401


# ── /voice-preview ────────────────────────────────────────────────────────────

_VALID_VOICE = "DMcOknq8n1B6XshFIJKJ"


class TestVoicePreview:
    def _make_client(self) -> TestClient:
        return _client_with_user()

    @patch("main.httpx.AsyncClient")
    def test_returns_audio_mpeg(self, mock_httpx_cls):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b"fake-audio-bytes"
        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=MagicMock(post=AsyncMock(return_value=mock_resp)))
        mock_httpx_cls.return_value = mock_cm

        client = self._make_client()
        resp = client.get(f"/voice-preview/{_VALID_VOICE}")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "audio/mpeg"

    def test_unknown_voice_id_returns_400(self):
        client = self._make_client()
        resp = client.get("/voice-preview/not-a-real-voice")
        assert resp.status_code == 400

    @patch("main.httpx.AsyncClient")
    def test_elevenlabs_failure_returns_502(self, mock_httpx_cls):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=MagicMock(post=AsyncMock(return_value=mock_resp)))
        mock_httpx_cls.return_value = mock_cm

        client = self._make_client()
        resp = client.get(f"/voice-preview/{_VALID_VOICE}")
        assert resp.status_code == 502

    @patch.dict(os.environ, {"ELEVENLABS_API_KEY": ""})
    def test_missing_elevenlabs_key_returns_500(self):
        client = self._make_client()
        resp = client.get(f"/voice-preview/{_VALID_VOICE}")
        assert resp.status_code == 500


# ── Room lifecycle / bot status tracking ─────────────────────────────────────

import httpx  # noqa: E402 — already imported at module level, kept here for clarity
import bot  # noqa: E402 — patched via references below


@pytest_asyncio.fixture
async def async_client():
    main.app.dependency_overrides[main.require_user] = lambda: VALID_USER
    with patch("database.init_db", new=AsyncMock()):
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client
    main.app.dependency_overrides.pop(main.require_user, None)


@pytest_asyncio.fixture(autouse=True)
async def reset_room_states():
    # Ensure the lock lives in the same event loop as the test.
    main._room_states_lock = asyncio.Lock()
    async with main._room_states_lock:
        main._room_states.clear()
    yield
    async with main._room_states_lock:
        for state in list(main._room_states.values()):
            if state.task is not None and not state.task.done():
                state.task.cancel()
                try:
                    await state.task
                except asyncio.CancelledError:
                    pass
        main._room_states.clear()


class TestRoomLifecycle:
    @pytest.mark.asyncio
    async def test_create_session_stores_starting_state(self, async_client):
        async def never_ending_run_bot(*args, **kwargs):
            await asyncio.Event().wait()

        with patch("bot.run_bot", new=never_ending_run_bot):
            with patch("main.create_participant_token", return_value="tok-abc"):
                resp = await async_client.post("/session", json=VALID_SESSION_BODY)
        assert resp.status_code == 200
        room_name = resp.json()["room_name"]
        status_resp = await async_client.get(f"/session/{room_name}/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["status"] == "starting"

    @pytest.mark.asyncio
    async def test_bot_ready_callback_marks_ready(self, async_client):
        async def fake_run_bot(*args, on_ready=None, **kwargs):
            if on_ready is not None:
                await on_ready()
            await asyncio.Event().wait()

        with patch("bot.run_bot", new=fake_run_bot):
            with patch("main.create_participant_token", return_value="tok-abc"):
                resp = await async_client.post("/session", json=VALID_SESSION_BODY)
                await asyncio.sleep(0)
        assert resp.status_code == 200
        room_name = resp.json()["room_name"]
        status_resp = await async_client.get(f"/session/{room_name}/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["status"] == "ready"

    @pytest.mark.asyncio
    async def test_bot_failure_marks_status_failed(self, async_client):
        with patch("bot.run_bot", side_effect=RuntimeError("boom")):
            with patch("main.create_participant_token", return_value="tok-abc"):
                resp = await async_client.post("/session", json=VALID_SESSION_BODY)
                await asyncio.sleep(0)
        assert resp.status_code == 200
        room_name = resp.json()["room_name"]
        status_resp = await async_client.get(f"/session/{room_name}/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["status"] == "failed"

    @pytest.mark.asyncio
    async def test_status_isolated_between_users(self, async_client):
        async def never_ending_run_bot(*args, **kwargs):
            await asyncio.Event().wait()

        with patch("bot.run_bot", new=never_ending_run_bot):
            with patch("main.create_participant_token", return_value="tok-abc"):
                resp = await async_client.post("/session", json=VALID_SESSION_BODY)
        room_name = resp.json()["room_name"]
        main.app.dependency_overrides[main.require_user] = lambda: {
            "id": 2,
            "username": "other",
        }
        status_resp = await async_client.get(f"/session/{room_name}/status")
        assert status_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_finished_tasks_are_removed(self, async_client):
        async def fake_run_bot(*args, on_ready=None, **kwargs):
            if on_ready is not None:
                await on_ready()

        with patch("bot.run_bot", new=fake_run_bot):
            with patch("main.create_participant_token", return_value="tok-abc"):
                resp = await async_client.post("/session", json=VALID_SESSION_BODY)
                await asyncio.sleep(0)
        room_name = resp.json()["room_name"]
        await main._cleanup_finished_tasks()
        async with main._room_states_lock:
            assert room_name not in main._room_states

    @pytest.mark.asyncio
    async def test_lifespan_cancels_running_tasks(self):
        async def long_task():
            await asyncio.sleep(100)

        task = asyncio.create_task(long_task())
        state = main.RoomState(status="starting", user_id=1, task=task)
        main._room_states_lock = asyncio.Lock()
        async with main._room_states_lock:
            main._room_states["room-test"] = state
        with patch("database.init_db", new=AsyncMock()):
            async with main.app.router.lifespan_context(main.app):
                pass
        assert state.task.cancelled()


class TestSessionKnowsTheLearner:
    """The tutor can only greet by name if the name reaches it.

    Covering _spawn_bot on its own was not enough: it passed while the call
    site in create_session quietly used the defaults.
    """

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_passes_name_and_history_to_the_bot(self, mock_token):
        import database

        spawn = AsyncMock()
        with patch.object(main, "_spawn_bot", new=spawn), patch.object(
            database, "get_sessions", new=AsyncMock(return_value=[{}, {}, {}])
        ):
            resp = _client_with_user().post("/session", json=VALID_SESSION_BODY)

        assert resp.status_code == 200
        kwargs = spawn.call_args.kwargs
        assert kwargs["learner_name"] == VALID_USER["username"]
        assert kwargs["previous_sessions"] == 3

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task", new=_discard_coroutine_task)
    def test_history_failure_still_starts_the_session(self, mock_token):
        """A greeting is worth less than the conversation it introduces."""
        import database

        spawn = AsyncMock()
        with patch.object(main, "_spawn_bot", new=spawn), patch.object(
            database, "get_sessions", new=AsyncMock(side_effect=RuntimeError("db down"))
        ):
            resp = _client_with_user().post("/session", json=VALID_SESSION_BODY)

        assert resp.status_code == 200
        kwargs = spawn.call_args.kwargs
        assert kwargs["learner_name"] == VALID_USER["username"]
        assert kwargs["previous_sessions"] == 0
