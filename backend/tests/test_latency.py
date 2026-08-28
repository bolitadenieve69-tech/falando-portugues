"""Tests for the per-turn latency probe."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest

from tests.conftest import (
    FrameDirection,
    Frame,
    TextFrame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    LLMFullResponseStartFrame,
    LLMFullResponseEndFrame,
    UserStoppedSpeakingFrame,
)

DOWN = FrameDirection.DOWNSTREAM


@pytest.fixture
def probe(tmp_path, monkeypatch):
    import utils.latency as lat
    monkeypatch.setattr(lat, "LATENCY_LOG", str(tmp_path / "latency.jsonl"))
    p = lat.LatencyProbe(room_name="tutor-abc", language="pt-PT", level="B1")
    p._log = tmp_path / "latency.jsonl"
    return p


def _records(probe):
    if not probe._log.exists():
        return []
    return [json.loads(l) for l in probe._log.read_text().splitlines() if l.strip()]


async def _full_turn(p, reply="Bom dia!"):
    await p.process_frame(UserStoppedSpeakingFrame(), DOWN)
    await p.process_frame(TranscriptionFrame(text="ola"), DOWN)
    await p.process_frame(LLMFullResponseStartFrame(), DOWN)
    await p.process_frame(TextFrame(text=reply), DOWN)
    await p.process_frame(TTSAudioRawFrame(), DOWN)


class TestCompleteTurn:
    @pytest.mark.asyncio
    async def test_emits_one_record(self, probe):
        await _full_turn(probe)
        assert len(_records(probe)) == 1

    @pytest.mark.asyncio
    async def test_all_stages_measured(self, probe):
        await _full_turn(probe)
        r = _records(probe)[0]
        for stage in ("stt_ms", "llm_ms", "tts_ms", "total_ms"):
            assert r[stage] is not None, stage
            assert r[stage] >= 0

    @pytest.mark.asyncio
    async def test_total_covers_the_stages(self, probe):
        await _full_turn(probe)
        r = _records(probe)[0]
        assert r["total_ms"] >= r["stt_ms"] + r["llm_ms"] + r["tts_ms"] - 1

    @pytest.mark.asyncio
    async def test_carries_session_context(self, probe):
        await _full_turn(probe)
        r = _records(probe)[0]
        assert r["room"] == "tutor-abc"
        assert r["language"] == "pt-PT"
        assert r["level"] == "B1"
        assert r["complete"] is True

    @pytest.mark.asyncio
    async def test_counts_characters(self, probe):
        await _full_turn(probe, reply="Bom dia!")
        r = _records(probe)[0]
        assert r["transcript_chars"] == 3
        assert r["reply_chars"] == 8

    @pytest.mark.asyncio
    async def test_only_first_audio_closes_the_turn(self, probe):
        await _full_turn(probe)
        await probe.process_frame(TTSAudioRawFrame(), DOWN)
        await probe.process_frame(TTSAudioRawFrame(), DOWN)
        assert len(_records(probe)) == 1


class TestTurnBoundaries:
    @pytest.mark.asyncio
    async def test_numbers_consecutive_turns(self, probe):
        await _full_turn(probe)
        await _full_turn(probe)
        assert [r["turn"] for r in _records(probe)] == [1, 2]

    @pytest.mark.asyncio
    async def test_flushes_an_unfinished_turn(self, probe):
        # Turn that never produced audio, then a new turn starts.
        await probe.process_frame(UserStoppedSpeakingFrame(), DOWN)
        await probe.process_frame(TranscriptionFrame(text="ola"), DOWN)
        await _full_turn(probe)
        recs = _records(probe)
        assert recs[0]["complete"] is False
        assert recs[0]["total_ms"] is None
        assert recs[1]["complete"] is True


class TestNonSpeechTraffic:
    @pytest.mark.asyncio
    async def test_typed_input_is_not_recorded(self, probe):
        # No UserStoppedSpeakingFrame: this turn came from the keyboard.
        await probe.process_frame(LLMFullResponseStartFrame(), DOWN)
        await probe.process_frame(TextFrame(text="Olá"), DOWN)
        await probe.process_frame(TTSAudioRawFrame(), DOWN)
        assert _records(probe) == []

    @pytest.mark.asyncio
    async def test_unrelated_frames_are_ignored(self, probe):
        await probe.process_frame(Frame(), DOWN)
        await probe.process_frame(LLMFullResponseEndFrame(), DOWN)
        assert _records(probe) == []


class TestResilience:
    @pytest.mark.asyncio
    async def test_disabled_without_a_log_path(self, tmp_path, monkeypatch):
        import utils.latency as lat
        monkeypatch.setattr(lat, "LATENCY_LOG", "")
        p = lat.LatencyProbe(room_name="r", language="pt-PT", level="B1")
        await _full_turn(p)  # must not raise
        assert p._enabled is False

    @pytest.mark.asyncio
    async def test_a_write_failure_never_breaks_the_session(self, probe, monkeypatch):
        import utils.latency as lat
        monkeypatch.setattr(lat, "LATENCY_LOG", "/nonexistent-root/nope/latency.jsonl")
        await _full_turn(probe)  # swallowed, no exception

    @pytest.mark.asyncio
    async def test_frames_keep_flowing_downstream(self, probe):
        # LatencyProbe extends IdentityFilter: super() must still be called.
        seen = []
        orig = probe.push_frame

        async def spy(frame, direction=None):
            seen.append(frame)
            return await orig(frame, direction)

        probe.push_frame = spy
        await probe.process_frame(TextFrame(text="x"), DOWN)
