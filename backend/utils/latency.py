"""Per-turn latency instrumentation.

Measures what the learner actually feels: the gap between finishing their
sentence and hearing the tutor start to answer, broken down by stage so a slow
turn can be attributed to STT, the LLM, or TTS.

The stage boundaries mirror the budget declared in CONTEXT.md:

    end of speech -> final transcript      target <= 1000 ms
    transcript    -> first LLM token       target <=  500 ms
    first token   -> first audio out       target <=  800 ms
    end of speech -> first audio out       target <= 2500 ms

**Why two probes.** No single point in the pipeline sees every frame: the user
context aggregator consumes TranscriptionFrames, so a probe placed after it
records the audio timings but never the transcript, leaving the STT and LLM
stages empty. One probe therefore sits just after speech-to-text and the other
just before audio output, both writing into one shared TurnTimings.

Records land in a JSONL file, one object per turn, ready for analysis with
scripts/latency_report.py.

This runs during real sessions, so every path is defensive: a failure here logs
and is swallowed rather than breaking the conversation.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from loguru import logger as loguru_logger

from pipecat.frames.frames import (
    Frame,
    LLMFullResponseEndFrame,
    TextFrame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.processors.filters.identity_filter import IdentityFilter
from pipecat.processors.frame_processor import FrameDirection

INPUT_STAGE = "input"
OUTPUT_STAGE = "output"


def _default_log_path() -> str:
    """Sit next to the database so the Docker volume persists both."""
    db = Path(os.environ.get("DB_PATH", "falando.db"))
    return str(db.parent / "latency.jsonl")


LATENCY_LOG = os.environ.get("LATENCY_LOG", _default_log_path())


def _now_ms() -> float:
    return time.time() * 1000.0


class TurnTimings:
    """Timings for the turn in flight, shared by the probes at both ends."""

    def __init__(self, room_name: str, language: str, level: str):
        self.room = room_name
        self.language = language
        self.level = level
        self.turn = 0
        self.reset()

    def reset(self) -> None:
        self.marks: dict[str, float] = {}
        self.transcript_chars = 0
        self.reply_chars = 0
        self.seen_first_token = False
        self.seen_first_audio = False

    def mark(self, name: str, first_only: bool = True) -> None:
        if first_only and name in self.marks:
            return
        self.marks[name] = _now_ms()

    def stage(self, a: str, b: str) -> float | None:
        ta, tb = self.marks.get(a), self.marks.get(b)
        return round(tb - ta, 1) if ta is not None and tb is not None else None

    def record(self, complete: bool) -> dict | None:
        """Build the record for this turn, or None if it was not a spoken turn."""
        if "speech_end" not in self.marks:
            return None  # typed input or a stray frame
        return {
            "ts": round(self.marks["speech_end"]),
            "room": self.room,
            "language": self.language,
            "level": self.level,
            "turn": self.turn,
            "complete": complete,
            "stt_ms": self.stage("speech_end", "transcript"),
            "llm_ms": self.stage("transcript", "first_token"),
            "tts_ms": self.stage("first_token", "first_audio"),
            "total_ms": self.stage("speech_end", "first_audio"),
            "transcript_chars": self.transcript_chars,
            "reply_chars": self.reply_chars,
        }


def write_record(record: dict) -> None:
    try:
        path = Path(LATENCY_LOG)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception as exc:
        loguru_logger.warning("[latency] could not write record: {}", exc)


class LatencyProbe(IdentityFilter):
    """Observes the frame stream at one end of the pipeline.

    Extends IdentityFilter so every frame continues downstream untouched. Place
    the INPUT_STAGE probe right after speech-to-text and the OUTPUT_STAGE one
    right before transport.output(), sharing a single TurnTimings.
    """

    def __init__(self, timings: TurnTimings, stage: str, **kwargs):
        super().__init__(**kwargs)
        self._t = timings
        self._stage = stage
        self._enabled = bool(LATENCY_LOG)

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)
        if not self._enabled:
            return
        try:
            if self._stage == INPUT_STAGE:
                self._observe_input(frame)
            else:
                self._observe_output(frame)
        except Exception as exc:  # never let metrics break a live session
            loguru_logger.warning("[latency] probe error: {}", exc)

    def _observe_input(self, frame: Frame) -> None:
        if isinstance(frame, UserStoppedSpeakingFrame):
            # A new turn begins. Flush anything incomplete from the previous one.
            self._emit(complete=False)
            self._t.reset()
            self._t.turn += 1
            self._t.mark("speech_end")
        elif isinstance(frame, TranscriptionFrame):
            # Interim results arrive as a different frame type, so this is final.
            self._t.mark("transcript")
            self._t.transcript_chars = len(frame.text or "")

    def _observe_output(self, frame: Frame) -> None:
        if isinstance(frame, TTSAudioRawFrame):
            if not self._t.seen_first_audio:
                self._t.seen_first_audio = True
                self._t.mark("first_audio")
                # First audio is the moment the learner perceives an answer.
                self._emit(complete=True)
                self._t.reset()
        elif isinstance(frame, TextFrame):
            # TTSAudioRawFrame is checked first, so this is LLM output text.
            if not self._t.seen_first_token:
                self._t.seen_first_token = True
                self._t.mark("first_token")
            self._t.reply_chars += len(frame.text or "")
        elif isinstance(frame, LLMFullResponseEndFrame):
            self._t.mark("llm_end")

    def _emit(self, complete: bool) -> None:
        record = self._t.record(complete)
        if record is None:
            return
        write_record(record)
        if complete:
            loguru_logger.info(
                "[latency] turn={} total={}ms (stt={} llm={} tts={})",
                record["turn"], record["total_ms"],
                record["stt_ms"], record["llm_ms"], record["tts_ms"],
            )
