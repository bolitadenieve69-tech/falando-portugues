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

from bot import TranscriptPublisher, _SerialAnthropicLLM  # noqa: E402
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
    async def test_llm_frame_dropped_when_locked(self):
        llm = _SerialAnthropicLLM()
        call_count = 0

        async def _slow_super(self_arg, frame, direction):
            nonlocal call_count
            await asyncio.sleep(0.05)
            call_count += 1

        with patch.object(_ParentLLM, "process_frame", new=_slow_super):
            frame1 = LLMContextFrame()
            frame2 = LLMContextFrame()

            task = asyncio.create_task(llm.process_frame(frame1, FrameDirection.DOWNSTREAM))
            await asyncio.sleep(0)  # yield so task acquires the lock

            # Second frame arrives while first is in-flight → should be dropped
            await llm.process_frame(frame2, FrameDirection.DOWNSTREAM)
            await task

        assert call_count == 1  # Only frame1 was processed
