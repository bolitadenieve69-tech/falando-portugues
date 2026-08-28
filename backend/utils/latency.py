"""Per-turn latency instrumentation.

Measures what the learner actually feels: the gap between finishing their
sentence and hearing the tutor start to answer, broken down by stage so a slow
turn can be attributed to STT, the LLM, or TTS.

The stage boundaries mirror the budget declared in CONTEXT.md:

    end of speech -> final transcript      target <= 1000 ms
    transcript    -> first LLM token       target <=  500 ms
    first token   -> first audio out       target <=  800 ms
    end of speech -> first audio out       target <= 2500 ms

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
    LLMFullResponseStartFrame,
    TextFrame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.processors.filters.identity_filter import IdentityFilter
from pipecat.processors.frame_processor import FrameDirection


def _default_log_path() -> str:
    """Sit next to the database so the Docker volume persists both."""
    db = Path(os.environ.get("DB_PATH", "falando.db"))
    return str(db.parent / "latency.jsonl")


LATENCY_LOG = os.environ.get("LATENCY_LOG", _default_log_path())


def _now_ms() -> float:
    return time.time() * 1000.0


class LatencyProbe(IdentityFilter):
    """Observes the frame stream and writes one record per completed turn.

    Extends IdentityFilter so every frame continues down the pipeline untouched.
    Place it immediately before transport.output(), where all the frames of
    interest have already passed through.
    """

    def __init__(self, room_name: str, language: str, level: str, **kwargs):
        super().__init__(**kwargs)
        self._room = room_name
        self._language = language
        self._level = level
        self._turn = 0
        self._enabled = bool(LATENCY_LOG)
        self._reset()

    def _reset(self) -> None:
        self._t = {}
        self._transcript_chars = 0
        self._reply_chars = 0
        self._seen_first_token = False
        self._seen_first_audio = False

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)
        if not self._enabled:
            return
        try:
            self._observe(frame)
        except Exception as exc:  # never let metrics break a live session
            loguru_logger.warning("[latency] probe error: {}", exc)

    def _observe(self, frame: Frame) -> None:
        if isinstance(frame, UserStoppedSpeakingFrame):
            # A new turn begins. Flush anything incomplete from the previous one.
            if self._t:
                self._emit(complete=False)
            self._reset()
            self._turn += 1
            self._t["speech_end"] = _now_ms()

        elif isinstance(frame, TranscriptionFrame):
            # Interim results arrive as a different frame type, so this is final.
            self._t.setdefault("transcript", _now_ms())
            self._transcript_chars = len(frame.text or "")

        elif isinstance(frame, LLMFullResponseStartFrame):
            self._t.setdefault("llm_start", _now_ms())

        elif isinstance(frame, TTSAudioRawFrame):
            if not self._seen_first_audio:
                self._seen_first_audio = True
                self._t["first_audio"] = _now_ms()
                # First audio is the moment the learner perceives an answer.
                self._emit(complete=True)
                # Close the turn, so the next one does not flush this again.
                self._reset()

        elif isinstance(frame, TextFrame):
            # TTSAudioRawFrame is checked first, so this is LLM output text.
            if not self._seen_first_token:
                self._seen_first_token = True
                self._t["first_token"] = _now_ms()
            self._reply_chars += len(frame.text or "")

        elif isinstance(frame, LLMFullResponseEndFrame):
            self._t.setdefault("llm_end", _now_ms())

    def _stage(self, a: str, b: str) -> float | None:
        ta, tb = self._t.get(a), self._t.get(b)
        return round(tb - ta, 1) if ta is not None and tb is not None else None

    def _emit(self, complete: bool) -> None:
        if "speech_end" not in self._t:
            return  # typed input or a stray frame, not a spoken turn
        record = {
            "ts": round(self._t["speech_end"]),
            "room": self._room,
            "language": self._language,
            "level": self._level,
            "turn": self._turn,
            "complete": complete,
            "stt_ms": self._stage("speech_end", "transcript"),
            "llm_ms": self._stage("transcript", "first_token"),
            "tts_ms": self._stage("first_token", "first_audio"),
            "total_ms": self._stage("speech_end", "first_audio"),
            "transcript_chars": self._transcript_chars,
            "reply_chars": self._reply_chars,
        }
        self._write(record)
        if complete:
            loguru_logger.info(
                "[latency] turn={} total={}ms (stt={} llm={} tts={})",
                record["turn"], record["total_ms"],
                record["stt_ms"], record["llm_ms"], record["tts_ms"],
            )

    def _write(self, record: dict) -> None:
        try:
            path = Path(LATENCY_LOG)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        except Exception as exc:
            loguru_logger.warning("[latency] could not write record: {}", exc)
