"""Tests for main.py FastAPI endpoints.

Uses httpx.AsyncClient + ASGITransport to test endpoints without network I/O.
All external calls (database, Anthropic, ElevenLabs, LiveKit) are patched.
"""

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
    @patch("main.asyncio.create_task")
    def test_returns_session_fields(self, mock_task, mock_token):
        client = self._make_client()
        resp = client.post("/session", json=VALID_SESSION_BODY)
        assert resp.status_code == 200
        body = resp.json()
        assert "room_name" in body
        assert body["room_name"].startswith("tutor-")
        assert body["token"] == "tok-abc"
        assert body["livekit_url"] == os.environ["LIVEKIT_URL"]

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task")
    def test_invalid_level_returns_422(self, mock_task, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "level": "Z9"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task")
    def test_invalid_topic_returns_422(self, mock_task, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "topic": "unknown_topic"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", return_value="tok-abc")
    @patch("main.asyncio.create_task")
    def test_invalid_voice_id_returns_422(self, mock_task, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "voice_id": "not-a-real-voice"}
        resp = client.post("/session", json=body)
        assert resp.status_code == 422

    @patch("main.create_participant_token", side_effect=KeyError("LIVEKIT_API_KEY"))
    @patch("main.asyncio.create_task")
    def test_missing_env_returns_500(self, mock_task, mock_token):
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
    @patch("main.asyncio.create_task")
    def test_participant_name_is_sanitized(self, mock_task, mock_token):
        client = self._make_client()
        body = {**VALID_SESSION_BODY, "participant_name": "  "}
        resp = client.post("/session", json=body)
        # Blank name is sanitized to "user" — request succeeds
        assert resp.status_code == 200


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
