"""Tests for the per-turn latency probes."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest

from tests.conftest import (
    FrameDirection, Frame, TextFrame, TranscriptionFrame, TTSAudioRawFrame,
    LLMFullResponseStartFrame, LLMFullResponseEndFrame, UserStoppedSpeakingFrame,
)

DOWN = FrameDirection.DOWNSTREAM


@pytest.fixture
def probes(tmp_path, monkeypatch):
    """The two probes wired to one shared state, as bot.py builds them."""
    import utils.latency as lat
    log = tmp_path / "latency.jsonl"
    monkeypatch.setattr(lat, "LATENCY_LOG", str(log))
    timings = lat.TurnTimings(room_name="tutor-abc", language="pt-PT", level="B1")
    pin = lat.LatencyProbe(timings, lat.INPUT_STAGE)
    pout = lat.LatencyProbe(timings, lat.OUTPUT_STAGE)
    pin._log = pout._log = log
    return pin, pout


def _records(p):
    return [json.loads(l) for l in p._log.read_text().splitlines() if l.strip()] \
        if p._log.exists() else []


async def _turn(pin, pout, said="ola", reply="Bom dia!"):
    """One full spoken turn, each frame entering at the end that sees it."""
    await pin.process_frame(UserStoppedSpeakingFrame(), DOWN)
    await pin.process_frame(TranscriptionFrame(text=said), DOWN)
    await pout.process_frame(LLMFullResponseStartFrame(), DOWN)
    await pout.process_frame(TextFrame(text=reply), DOWN)
    await pout.process_frame(TTSAudioRawFrame(), DOWN)


class TestCompleteTurn:
    @pytest.mark.asyncio
    async def test_emits_one_record(self, probes):
        pin, pout = probes
        await _turn(pin, pout)
        assert len(_records(pin)) == 1

    @pytest.mark.asyncio
    async def test_every_stage_is_measured(self, probes):
        """The whole point of the split: stt and llm used to come back null."""
        pin, pout = probes
        await _turn(pin, pout)
        r = _records(pin)[0]
        for stage in ("stt_ms", "llm_ms", "tts_ms", "total_ms"):
            assert r[stage] is not None, stage
            assert r[stage] >= 0

    @pytest.mark.asyncio
    async def test_total_covers_the_stages(self, probes):
        pin, pout = probes
        await _turn(pin, pout)
        r = _records(pin)[0]
        assert r["total_ms"] >= r["stt_ms"] + r["llm_ms"] + r["tts_ms"] - 1

    @pytest.mark.asyncio
    async def test_counts_characters_from_both_ends(self, probes):
        pin, pout = probes
        await _turn(pin, pout, said="ola", reply="Bom dia!")
        r = _records(pin)[0]
        assert r["transcript_chars"] == 3
        assert r["reply_chars"] == 8

    @pytest.mark.asyncio
    async def test_carries_session_context(self, probes):
        pin, pout = probes
        await _turn(pin, pout)
        r = _records(pin)[0]
        assert (r["room"], r["language"], r["level"], r["complete"]) == \
               ("tutor-abc", "pt-PT", "B1", True)

    @pytest.mark.asyncio
    async def test_only_the_first_audio_closes_the_turn(self, probes):
        pin, pout = probes
        await _turn(pin, pout)
        await pout.process_frame(TTSAudioRawFrame(), DOWN)
        assert len(_records(pin)) == 1


class TestTurnBoundaries:
    @pytest.mark.asyncio
    async def test_numbers_consecutive_turns(self, probes):
        pin, pout = probes
        await _turn(pin, pout)
        await _turn(pin, pout)
        assert [r["turn"] for r in _records(pin)] == [1, 2]

    @pytest.mark.asyncio
    async def test_flushes_a_turn_that_never_produced_audio(self, probes):
        pin, pout = probes
        await pin.process_frame(UserStoppedSpeakingFrame(), DOWN)
        await pin.process_frame(TranscriptionFrame(text="ola"), DOWN)
        await _turn(pin, pout)
        recs = _records(pin)
        assert recs[0]["complete"] is False
        assert recs[0]["total_ms"] is None
        assert recs[0]["stt_ms"] is not None  # what we did capture is kept
        assert recs[1]["complete"] is True


class TestNonSpeechTraffic:
    @pytest.mark.asyncio
    async def test_typed_input_is_not_recorded(self, probes):
        pin, pout = probes
        await pout.process_frame(LLMFullResponseStartFrame(), DOWN)
        await pout.process_frame(TextFrame(text="Olá"), DOWN)
        await pout.process_frame(TTSAudioRawFrame(), DOWN)
        assert _records(pin) == []

    @pytest.mark.asyncio
    async def test_unrelated_frames_are_ignored(self, probes):
        pin, pout = probes
        await pin.process_frame(Frame(), DOWN)
        await pout.process_frame(LLMFullResponseEndFrame(), DOWN)
        assert _records(pin) == []


class TestResilience:
    @pytest.mark.asyncio
    async def test_disabled_without_a_log_path(self, monkeypatch):
        import utils.latency as lat
        monkeypatch.setattr(lat, "LATENCY_LOG", "")
        t = lat.TurnTimings("r", "pt-PT", "B1")
        pin = lat.LatencyProbe(t, lat.INPUT_STAGE)
        pout = lat.LatencyProbe(t, lat.OUTPUT_STAGE)
        await _turn(pin, pout)  # must not raise
        assert pin._enabled is False

    @pytest.mark.asyncio
    async def test_a_write_failure_never_breaks_the_session(self, probes, monkeypatch):
        import utils.latency as lat
        pin, pout = probes
        monkeypatch.setattr(lat, "LATENCY_LOG", "/nonexistent-root/nope/latency.jsonl")
        await _turn(pin, pout)  # swallowed, no exception
