"""Tests for bot.py — TranscriptPublisher and _SerialAnthropicLLM.

Pipecat and loguru are stubbed in conftest.py so bot.py can be imported
without the full real-time pipeline infrastructure.
"""

import asyncio
import json
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Env vars required to import main (loaded transitively)
_TEST_ENV = {
    "ANTHROPIC_API_KEY": "test-key",
    "DEEPGRAM_API_KEY": "test-key",
    "ELEVENLABS_API_KEY": "test-key",
    "LIVEKIT_URL": "wss://test.livekit.cloud",
    "LIVEKIT_API_KEY": "test-key",
    "LIVEKIT_API_SECRET": "test-secret",
}
for _k, _v in _TEST_ENV.items():
    if not os.environ.get(_k):
        os.environ[_k] = _v

import bot
from bot import TranscriptPublisher, _SerialAnthropicLLM, run_bot  # noqa: E402
from tests.conftest import (  # noqa: E402 — use stubs registered in conftest
    Frame,
    FrameDirection,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    TextFrame,
    TranscriptionFrame,
    UserStoppedSpeakingFrame,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mock_room(published: list) -> MagicMock:
    """Return a fake LiveKit room whose publish_data appends decoded JSON to `published`."""
    async def _publish_data(payload, reliable=False, kind=None):
        published.append(json.loads(payload.decode()))

    participant = MagicMock()
    participant.publish_data = AsyncMock(side_effect=_publish_data)
    room = MagicMock()
    room.local_participant = participant
    return room


# ── TranscriptPublisher — user speaker ───────────────────────────────────────

class TestTranscriptPublisherUser:
    def _publisher(self, published: list) -> TranscriptPublisher:
        pub = TranscriptPublisher(speaker="user")
        pub.set_room(_mock_room(published))
        return pub

    @pytest.mark.asyncio
    async def test_transcription_frame_publishes_text(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(TranscriptionFrame(text="olá mundo"), FrameDirection.DOWNSTREAM)
        assert len(published) == 1
        assert published[0] == {"type": "transcript", "speaker": "user", "text": "olá mundo"}

    @pytest.mark.asyncio
    async def test_empty_transcription_not_published(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(TranscriptionFrame(text="  "), FrameDirection.DOWNSTREAM)
        assert published == []

    @pytest.mark.asyncio
    async def test_user_stopped_speaking_does_not_publish(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(UserStoppedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        assert published == []

    @pytest.mark.asyncio
    async def test_no_room_silently_skips(self):
        pub = TranscriptPublisher(speaker="user")  # No room set
        # Should not raise
        await pub.process_frame(TranscriptionFrame(text="hello"), FrameDirection.DOWNSTREAM)

    @pytest.mark.asyncio
    async def test_irrelevant_frame_does_not_publish(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(Frame(), FrameDirection.DOWNSTREAM)
        assert published == []


# ── TranscriptPublisher — tutor speaker ──────────────────────────────────────

class TestTranscriptPublisherTutor:
    def _publisher(self, published: list) -> TranscriptPublisher:
        pub = TranscriptPublisher(speaker="tutor")
        pub.set_room(_mock_room(published))
        return pub

    @pytest.mark.asyncio
    async def test_full_response_published_on_end(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="Bom "), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="dia!"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert len(published) == 1
        assert published[0] == {
            "type": "transcript",
            "speaker": "tutor",
            "text": "Bom dia!",
            "correction": None,
        }

    @pytest.mark.asyncio
    async def test_empty_response_not_published(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert published == []

    @pytest.mark.asyncio
    async def test_buffer_resets_between_responses(self):
        published: list = []
        pub = self._publisher(published)
        # First response
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="Olá!"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        # Second response
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="Tchau!"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert len(published) == 2
        assert published[0]["text"] == "Olá!"
        assert published[1]["text"] == "Tchau!"

    @pytest.mark.asyncio
    async def test_correction_is_parsed_into_payload(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(
            TextFrame(text="(Correção: diz-se fui em vez de fui a.) Boa pergunta!"),
            FrameDirection.DOWNSTREAM,
        )
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert published == [{
            "type": "transcript",
            "speaker": "tutor",
            "text": "Boa pergunta!",
            "correction": "diz-se fui em vez de fui a.",
        }]

    @pytest.mark.asyncio
    async def test_correction_only_reply_keeps_original_text(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="(Correção: diz-se obrigado.)"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert published == [{
            "type": "transcript",
            "speaker": "tutor",
            "text": "(Correção: diz-se obrigado.)",
            "correction": None,
        }]

    @pytest.mark.asyncio
    async def test_no_correction_publishes_null(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="Bom dia!"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert published[0]["correction"] is None

    @pytest.mark.asyncio
    async def test_publish_failure_is_swallowed(self):
        pub = TranscriptPublisher(speaker="tutor")
        bad_room = MagicMock()
        bad_room.local_participant.publish_data = AsyncMock(side_effect=RuntimeError("network error"))
        pub.set_room(bad_room)
        # Should not raise
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="Olá!"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)


# ── _SerialAnthropicLLM ───────────────────────────────────────────────────────

# The parent of _SerialAnthropicLLM is the conftest stub AnthropicLLMService.
from tests.conftest import AnthropicLLMService as _ParentLLM  # noqa: E402


class TestSerialAnthropicLLM:
    @pytest.mark.asyncio
    async def test_non_llm_frame_calls_super(self):
        """Non-LLMContextFrame goes straight to super().process_frame."""
        llm = _SerialAnthropicLLM()
        with patch.object(_ParentLLM, "process_frame", new_callable=AsyncMock) as mock_super:
            await llm.process_frame(TextFrame(text="hello"), FrameDirection.DOWNSTREAM)
        mock_super.assert_awaited_once()
        args = mock_super.await_args[0]
        assert isinstance(args[0], TextFrame)

    @pytest.mark.asyncio
    async def test_llm_frame_calls_super_when_not_locked(self):
        llm = _SerialAnthropicLLM()
        with patch.object(_ParentLLM, "process_frame", new_callable=AsyncMock) as mock_super:
            frame = LLMContextFrame()
            await llm.process_frame(frame, FrameDirection.DOWNSTREAM)
        mock_super.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_llm_frame_queues_latest_pending_frame_when_locked(self):
        llm = _SerialAnthropicLLM()
        processed_frames = []

        async def _slow_super(self_arg, frame, direction):
            processed_frames.append(frame)
            await asyncio.sleep(0.05)

        with patch.object(_ParentLLM, "process_frame", new=_slow_super):
            frame1 = LLMContextFrame()
            frame2 = LLMContextFrame()

            task = asyncio.create_task(llm.process_frame(frame1, FrameDirection.DOWNSTREAM))
            await asyncio.sleep(0)  # yield so task acquires the lock

            await llm.process_frame(frame2, FrameDirection.DOWNSTREAM)
            await task

        assert len(processed_frames) == 2
        assert processed_frames[0] is frame1
        assert processed_frames[1] is frame2

    @pytest.mark.asyncio
    async def test_llm_frame_dropped_if_same_frame_requeued(self):
        llm = _SerialAnthropicLLM()
        processed_frames = []

        async def _slow_super(self_arg, frame, direction):
            processed_frames.append(frame)
            await asyncio.sleep(0.05)

        with patch.object(_ParentLLM, "process_frame", new=_slow_super):
            frame1 = LLMContextFrame()
            frame2 = LLMContextFrame()

            task = asyncio.create_task(llm.process_frame(frame1, FrameDirection.DOWNSTREAM))
            await asyncio.sleep(0)
            await llm.process_frame(frame2, FrameDirection.DOWNSTREAM)
            await llm.process_frame(frame2, FrameDirection.DOWNSTREAM)
            await task

        assert len(processed_frames) == 2
        assert processed_frames[1] is frame2


class TestRunBot:
    @pytest.mark.asyncio
    async def test_run_bot_succeeds_first_attempt(self):
        with patch.object(bot, "_run_pipeline", new=AsyncMock(return_value=None)) as mock_pipeline:
            with patch("bot.load_dotenv"):
                await run_bot("wss://test", "token", room_name="room1")
        mock_pipeline.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_run_bot_retries_then_succeeds(self):
        pipeline = AsyncMock(side_effect=[Exception("boom"), None])
        with patch.object(bot, "_run_pipeline", new=pipeline):
            with patch("bot.load_dotenv"):
                with patch("bot.random.uniform", return_value=0.5):
                    with patch("asyncio.sleep", new=AsyncMock()) as mock_sleep:
                        await run_bot("wss://test", "token", room_name="room1")
        assert pipeline.await_count == 2
        mock_sleep.assert_awaited_once_with(1.5)

    @pytest.mark.asyncio
    async def test_run_bot_raises_after_max_retries(self):
        pipeline = AsyncMock(side_effect=Exception("persistent failure"))
        with patch.object(bot, "_run_pipeline", new=pipeline):
            with patch("bot.load_dotenv"):
                with patch("asyncio.sleep", new=AsyncMock()) as mock_sleep:
                    with pytest.raises(Exception, match="persistent failure"):
                        await run_bot("wss://test", "token", room_name="room1", max_retries=3)
        assert pipeline.await_count == 3
        assert mock_sleep.await_count == 2

    @pytest.mark.asyncio
    async def test_run_pipeline_cancels_task_on_disconnect(self, monkeypatch):
        created: dict[str, object] = {}

        class DummyTask:
            def __init__(self, *args, **kwargs):
                created["task"] = self
                self.cancelled = False

            async def cancel(self):
                self.cancelled = True

            async def queue_frames(self, frames):
                return

            def event_handler(self, event_name):
                def decorator(handler):
                    setattr(self, f"_handler_{event_name}", handler)
                    return handler

                return decorator

        class DummyTransport:
            def __init__(self, *args, **kwargs):
                created["transport"] = self

            def input(self):
                return MagicMock()

            def output(self):
                return MagicMock()

            def event_handler(self, event_name):
                def decorator(handler):
                    setattr(self, f"_handler_{event_name}", handler)
                    return handler

                return decorator

        class DummyRunner:
            async def run(self, task):
                # no-op; allow the pipeline setup to complete
                return

        class DummyLiveOptions:
            def __init__(self, *args, **kwargs):
                pass

        class DummyInputParams:
            def __init__(self, *args, **kwargs):
                pass

        monkeypatch.setattr(bot, "PipelineTask", DummyTask)
        monkeypatch.setattr(bot, "LiveKitTransport", DummyTransport)
        monkeypatch.setattr(bot, "PipelineRunner", DummyRunner)
        monkeypatch.setattr(bot, "LiveOptions", DummyLiveOptions)
        monkeypatch.setattr(bot.AnthropicLLMService, "InputParams", DummyInputParams, raising=False)

        await bot._run_pipeline(
            room_url="wss://test",
            token="token",
            room_name="room1",
            level="B1",
            topic="livre",
            voice_id="DMcOknq8n1B6XshFIJKJ",
            language="pt_pt",
        )

        transport = created.get("transport")
        task = created.get("task")
        assert transport is not None
        assert task is not None

        handler = getattr(transport, "_handler_on_disconnected", None)
        assert handler is not None

        await handler(transport)
        assert task.cancelled is True


class TestOnReadyCallback:
    @pytest.mark.asyncio
    async def test_on_ready_is_called_when_first_participant_joins(self, monkeypatch):
        created: dict[str, object] = {}
        ready_called = False

        async def on_ready():
            nonlocal ready_called
            ready_called = True

        class DummyTask:
            def __init__(self, *args, **kwargs):
                created["task"] = self

            async def cancel(self):
                pass

            async def queue_frames(self, frames):
                pass

            def event_handler(self, event_name):
                def decorator(handler):
                    setattr(self, f"_handler_{event_name}", handler)
                    return handler

                return decorator

        class DummyTransport:
            def __init__(self, *args, **kwargs):
                created["transport"] = self

            def input(self):
                return MagicMock()

            def output(self):
                return MagicMock()

            def event_handler(self, event_name):
                def decorator(handler):
                    setattr(self, f"_handler_{event_name}", handler)
                    return handler

                return decorator

        class DummyRunner:
            async def run(self, task):
                return

        class DummyLiveOptions:
            def __init__(self, *args, **kwargs):
                pass

        class DummyInputParams:
            def __init__(self, *args, **kwargs):
                pass

        monkeypatch.setattr(bot, "PipelineTask", DummyTask)
        monkeypatch.setattr(bot, "LiveKitTransport", DummyTransport)
        monkeypatch.setattr(bot, "PipelineRunner", DummyRunner)
        monkeypatch.setattr(bot, "LiveOptions", DummyLiveOptions)
        monkeypatch.setattr(bot.AnthropicLLMService, "InputParams", DummyInputParams, raising=False)

        await bot._run_pipeline(
            room_url="wss://test",
            token="token",
            room_name="room1",
            level="B1",
            topic="livre",
            voice_id="DMcOknq8n1B6XshFIJKJ",
            language="pt_pt",
            on_ready=on_ready,
        )

        transport = created.get("transport")
        assert transport is not None
        handler = getattr(transport, "_handler_on_first_participant_joined", None)
        assert handler is not None

        await handler(transport, "user-1")
        assert ready_called is True


class TestEndpointing:
    """How long a learner may pause before the turn is considered over."""

    def test_beginners_get_more_thinking_time(self):
        from bot import endpointing_for
        assert endpointing_for("A1") > endpointing_for("B1") > endpointing_for("C2")

    def test_every_level_is_longer_than_the_old_default(self):
        # 1000 ms cut a third of the turns mid-sentence in a real session.
        from bot import endpointing_for
        for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            assert endpointing_for(level) > 1000, level

    def test_unknown_level_falls_back(self):
        from bot import endpointing_for
        assert endpointing_for("Z9") == endpointing_for("B1")

    def test_utterance_end_sits_above_endpointing(self):
        """It must be the later signal: raw silence decides first, word gaps last."""
        from bot import endpointing_for, utterance_end_for
        for level in ["A1", "B1", "C2"]:
            assert utterance_end_for(level) > endpointing_for(level), level

    def test_utterance_end_respects_the_provider_floor(self):
        from bot import utterance_end_for
        assert utterance_end_for("C2") >= 1000

    def test_environment_overrides_every_level(self, monkeypatch):
        import importlib, bot
        monkeypatch.setenv("DEEPGRAM_ENDPOINTING_MS", "3000")
        importlib.reload(bot)
        assert bot.endpointing_for("A1") == 3000
        assert bot.endpointing_for("C2") == 3000
        monkeypatch.delenv("DEEPGRAM_ENDPOINTING_MS")
        importlib.reload(bot)


class TestTurnPatienceIsInTheRightLayer:
    """Patience belongs to the turn analyser, not to the transcriber.

    Deepgram's endpointing decides when a *transcript* is final. What decides
    when the *turn* is over is Pipecat's Smart Turn v3 analyser, whose
    stop_secs (3 s by default) caps how long it will wait no matter how
    unfinished the learner sounds. Measured pauses of 3.6-5.0 s sailed past
    that cap, which is why raising the Deepgram values changed nothing.
    """

    def test_learners_get_longer_than_the_three_second_default(self):
        from bot import turn_patience_for

        for level in ["A1", "A2", "B1", "B2"]:
            assert turn_patience_for(level) > 3.0, level

    def test_patience_decreases_with_fluency(self):
        from bot import turn_patience_for

        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        values = [turn_patience_for(lvl) for lvl in levels]
        assert values == sorted(values, reverse=True)

    def test_capped_below_the_analysers_segment_limit(self):
        """Silence beyond max_duration_secs (8 s) cannot be analysed."""
        from bot import turn_patience_for

        for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            assert turn_patience_for(level) <= 8.0, level

    def test_unknown_level_falls_back_to_b1(self):
        from bot import turn_patience_for

        assert turn_patience_for("Z9") == turn_patience_for("B1")

    def test_transcription_endpointing_is_not_used_for_patience(self):
        """Endpointing went back to transcription-sized values."""
        from bot import endpointing_for

        assert endpointing_for("B1") <= 2500


class TestConversationPrivacyInLogs:
    """Lo que se dice en una conversación no debe quedar en los registros.

    Cada frase del alumno y del tutor se escribía entera en el registro del
    contenedor, donde permanece durante toda la vida del proceso y la lee
    cualquiera con acceso al servidor. Es contenido personal: alguien
    practicando un idioma habla de su trabajo, su familia o su salud.

    Para depurar hace falta poder verlo, así que se conserva tras una variable
    de entorno que por defecto está apagada.
    """

    def test_hidden_by_default(self):
        from bot import loggable_transcript

        assert "Alentejo" not in loggable_transcript("Conheço bem o Alentejo")

    def test_keeps_the_shape_so_turn_taking_can_be_diagnosed(self):
        """El tamaño y la existencia del turno siguen siendo visibles."""
        from bot import loggable_transcript

        frase = "Conheço bem o Alentejo"
        assert str(len(frase)) in loggable_transcript(frase)

    def test_shown_when_explicitly_enabled(self):
        import bot

        with patch.object(bot, "_LOG_TRANSCRIPTS", True):
            assert bot.loggable_transcript("Olá Angel") == "Olá Angel"

    def test_empty_text_says_so_rather_than_reporting_zero(self):
        from bot import loggable_transcript

        assert loggable_transcript("") == "(vazio)"


class TestTurnSafetyNet:
    """El turno tiene que cerrarse siempre, aunque el modelo nunca se decida.

    Observado en grabación real el 04-09-2026: el alumno interrumpe al tutor,
    habla, y el analizador semántico agota su espera dictaminando que la frase
    suena inacabada. Como esa estrategia sólo cierra el turno cuando el modelo
    dice COMPLETE, nadie lo cerró y el tutor se quedó mudo para siempre. No hubo
    error ni excepción: sencillamente dejó de responder.

    Una segunda estrategia por tiempo cierra el turno cuando la primera falla.
    """

    def test_always_waits_longer_than_the_analyser(self):
        """Si saltara antes, se comería las dudas que el analizador respeta."""
        from bot import turn_patience_for, turn_safety_net_for

        for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            assert turn_safety_net_for(level) > turn_patience_for(level), level

    def test_never_leaves_the_learner_waiting_forever(self):
        from bot import turn_safety_net_for

        for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            assert turn_safety_net_for(level) <= 12.0, level

    def test_unknown_level_falls_back_to_b1(self):
        from bot import turn_safety_net_for

        assert turn_safety_net_for("Z9") == turn_safety_net_for("B1")
