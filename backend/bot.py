"""Pipecat pipeline — the AI tutor bot that runs inside a LiveKit room."""

import asyncio
import json
import logging
import os
import random
from typing import Callable

from dotenv import load_dotenv
from loguru import logger as loguru_logger

logger = logging.getLogger(__name__)

from pipecat.frames.frames import (
    Frame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMMessagesAppendFrame,
    LLMRunFrame,
    TextFrame,
    TranscriptionFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.processors.filters.identity_filter import IdentityFilter
from pipecat.processors.frame_processor import FrameDirection
from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.deepgram.stt import DeepgramSTTService, LiveOptions
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

from languages import DEFAULT_LANGUAGE, get_language
from utils.corrections import parse_correction
from utils.latency import INPUT_STAGE, OUTPUT_STAGE, LatencyProbe, TurnTimings

# Hard cap on session length so an abandoned session cannot keep consuming
# Deepgram/Anthropic/ElevenLabs indefinitely.
MAX_SESSION_SECONDS = int(os.environ.get("MAX_SESSION_MINUTES", "30")) * 60

# eleven_flash_v2_5 is ~2-3x faster/cheaper; override to A/B test latency
# vs. voice quality for PT-PT before committing to a default.
TTS_MODEL = os.environ.get("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")

# How much silence ends the learner's turn. A learner pauses to hunt for a word
# far more than a native speaker does, and at the original 1000 ms a third of the
# turns in a real session were cut mid-sentence: the fragment triggered a reply
# that was then cancelled by the rest of the utterance, so the learner heard
# nothing. Lower levels get more thinking time. The cost is that the tutor waits
# longer before answering, which is the better trade: being interrupted mid
# sentence is worse than a slightly slower reply.
_ENDPOINTING_BY_LEVEL = {
    "A1": 2500, "A2": 2300, "B1": 2000, "B2": 1800, "C1": 1500, "C2": 1300,
}
_ENDPOINTING_OVERRIDE = int(os.environ.get("DEEPGRAM_ENDPOINTING_MS", "0"))

# Deepgram's floor for this parameter.
_MIN_UTTERANCE_END_MS = 1000


def endpointing_for(level: str) -> int:
    return _ENDPOINTING_OVERRIDE or _ENDPOINTING_BY_LEVEL.get(level, 2000)


def utterance_end_for(level: str) -> int:
    """A second, more forgiving check on whether the learner has finished.

    endpointing measures raw silence, so a learner hunting for a word looks
    identical to one who has finished. utterance_end_ms instead looks at the gaps
    between words, which separates thinking from stopping. Held above the
    endpointing value so it acts as the later, deciding signal.
    """
    return max(_MIN_UTTERANCE_END_MS, endpointing_for(level) + 800)


class TranscriptPublisher(IdentityFilter):
    """Taps into the frame stream and publishes transcripts to the LiveKit data channel.

    Extends IdentityFilter so ALL frames pass through the pipeline correctly.
    Two instances are used:
    - speaker="user"  placed after STT — captures what the user says
    - speaker="tutor" placed after LLM — captures the tutor's full response
    """

    def __init__(self, speaker: str, **kwargs):
        super().__init__(**kwargs)
        self._speaker = speaker
        self._room = None
        self._buffer: list[str] = []

    def set_room(self, room) -> None:
        self._room = room

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        # IdentityFilter.process_frame calls super() + push_frame — all frames pass through.
        await super().process_frame(frame, direction)

        if self._room is None:
            return

        if self._speaker == "user":
            if isinstance(frame, TranscriptionFrame):
                text = (frame.text or "").strip()
                if text:
                    loguru_logger.info("[transcript] user: {}", text)
                    await self._publish(text)
            elif isinstance(frame, UserStoppedSpeakingFrame):
                loguru_logger.info("[transcript] user turn ended")

        elif self._speaker == "tutor":
            if isinstance(frame, LLMFullResponseStartFrame):
                self._buffer = []
                loguru_logger.info("[transcript] tutor response starting")
            elif isinstance(frame, TextFrame):
                self._buffer.append(frame.text or "")
            elif isinstance(frame, LLMFullResponseEndFrame):
                full = "".join(self._buffer).strip()
                self._buffer = []
                if full:
                    loguru_logger.info("[transcript] tutor: {}", full)
                    correction, clean = parse_correction(full)
                    if not clean:
                        # Correction-only reply: keep the original text and drop
                        # the structured field so the client never renders the
                        # same correction twice.
                        correction = None
                        clean = full
                    await self._publish(clean, correction=correction)
                else:
                    loguru_logger.warning("[transcript] tutor response was empty")

    async def _publish(self, text: str, correction: str | None = None) -> None:
        try:
            message: dict[str, str | None] = {"type": "transcript", "speaker": self._speaker, "text": text}
            if self._speaker == "tutor":
                message["correction"] = correction
            payload = json.dumps(message).encode()
            local = self._room.local_participant
            try:
                await local.publish_data(payload, reliable=True)
            except TypeError:
                from livekit import rtc
                await local.publish_data(payload, kind=rtc.DataPacketKind.RELIABLE)
        except Exception as exc:
            loguru_logger.warning("[transcript] publish ({}) failed: {}", self._speaker, exc)


class _SerialAnthropicLLM(AnthropicLLMService):
    """Prevents concurrent Anthropic API calls.

    While a generation is already in-flight, keep only the latest pending
    LLMContextFrame. This preserves the most recent user intent without
    overwhelming the model with duplicate or stale requests.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._generation_lock = asyncio.Lock()
        self._pending_context_frame: LLMContextFrame | None = None

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, LLMContextFrame):
            loguru_logger.info("[llm] LLMContextFrame received — lock={}", self._generation_lock.locked())
            if self._generation_lock.locked():
                loguru_logger.warning("[llm-gate] already generating — queuing latest frame")
                self._pending_context_frame = frame
                return

            async with self._generation_lock:
                current_frame = frame
                while True:
                    loguru_logger.info("[llm] generation started")
                    await super().process_frame(current_frame, direction)
                    loguru_logger.info("[llm] generation complete")
                    if self._pending_context_frame is None:
                        break
                    current_frame = self._pending_context_frame
                    self._pending_context_frame = None
                    loguru_logger.info("[llm] processing pending queued frame")
        else:
            await super().process_frame(frame, direction)


async def run_bot(
    room_url: str,
    token: str,
    room_name: str = "tutor-room",
    level: str = "B1",
    topic: str = "livre",
    voice_id: str = "DMcOknq8n1B6XshFIJKJ",
    language: str = DEFAULT_LANGUAGE,
    max_retries: int = 3,
    on_ready: Callable[[], None] | None = None,
    learner_name: str | None = None,
    previous_sessions: int = 0,
) -> None:
    load_dotenv(override=True)

    for attempt in range(1, max_retries + 1):
        try:
            await _run_pipeline(room_url, token, room_name, level, topic, voice_id, language,
                                on_ready=on_ready, learner_name=learner_name,
                                previous_sessions=previous_sessions)
            return
        except Exception as exc:
            if attempt < max_retries:
                base_wait = min(30, 2 ** (attempt - 1))
                wait = base_wait + random.uniform(0.0, 1.0)
                logger.warning(
                    "[bot] %s — attempt %d/%d failed (%s). Retrying in %.1fs…",
                    room_name, attempt, max_retries, exc, wait,
                )
                await asyncio.sleep(wait)
            else:
                logger.error("[bot] %s — all %d attempts failed: %s", room_name, max_retries, exc)
                raise


async def _run_pipeline(
    room_url: str,
    token: str,
    room_name: str,
    level: str,
    topic: str,
    voice_id: str,
    language: str = DEFAULT_LANGUAGE,
    on_ready: Callable[[], None] | None = None,
    learner_name: str | None = None,
    previous_sessions: int = 0,
) -> None:
    profile = get_language(language) or get_language(DEFAULT_LANGUAGE)

    transport = LiveKitTransport(
        url=room_url,
        token=token,
        room_name=room_name,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    )

    stt = DeepgramSTTService(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        live_options=LiveOptions(
            language=profile.stt_language,
            model="nova-3-general",
            endpointing=endpointing_for(level),
            utterance_end_ms=utterance_end_for(level),
            smart_format=True,
            interim_results=True,
            punctuate=True,
        ),
    )

    system_prompt = profile.build_system_prompt(
        level=level, topic=topic,
        learner_name=learner_name, previous_sessions=previous_sessions,
    )
    logger.info("[bot] lang=%s prompt[:120]: %s", profile.code, system_prompt[:120])

    llm = _SerialAnthropicLLM(
        api_key=os.environ["ANTHROPIC_API_KEY"],
        model="claude-haiku-4-5-20251001",
        params=AnthropicLLMService.InputParams(max_tokens=256),
    )

    context = LLMContext(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Olá!"},
        ]
    )

    context_aggregator = LLMContextAggregatorPair(context)
    user_pub = TranscriptPublisher("user")
    tutor_pub = TranscriptPublisher("tutor")
    # Two probes, one shared state: the context aggregator downstream consumes
    # TranscriptionFrames, so the transcript timing has to be taken before it.
    timings = TurnTimings(room_name=room_name, language=profile.code, level=level)
    latency_in = LatencyProbe(timings, INPUT_STAGE)
    latency_out = LatencyProbe(timings, OUTPUT_STAGE)

    # WebSocket TTS streams audio chunks as they are generated, so playback
    # starts before the full reply is synthesized (vs. waiting for the whole
    # HTTP response with the old ElevenLabsHttpTTSService).
    tts = ElevenLabsTTSService(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        voice_id=voice_id,
        model=TTS_MODEL,
    )

    pipeline = Pipeline([
        transport.input(),
        stt,
        user_pub,
        latency_in,
        context_aggregator.user(),
        llm,
        tutor_pub,
        tts,
        latency_out,
        transport.output(),
        context_aggregator.assistant(),
    ])

    # enable_rtvi=False removes the RTVIProcessor wrapper that waits for an
    # RTVI handshake that never arrives (our app uses LiveKit directly).
    task = PipelineTask(pipeline, enable_rtvi=False)

    @task.event_handler("on_pipeline_started")
    async def on_pipeline_started(task, frame):
        loguru_logger.info("[bot] on_pipeline_started fired — pipeline is running")

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant_id: str):
        loguru_logger.info("[bot] first participant joined: {}", participant_id)
        # Room is now connected — safe to access local_participant.
        try:
            room = transport._client.room
            user_pub.set_room(room)
            tutor_pub.set_room(room)
            loguru_logger.info("[bot] room reference set on publishers")
        except Exception as exc:
            loguru_logger.warning("[bot] could not set room on publishers: {}", exc)
        # Notify the backend that the tutor is connected and ready.
        if on_ready is not None:
            try:
                await on_ready()
                loguru_logger.info("[bot] on_ready callback completed")
            except Exception as exc:
                loguru_logger.warning("[bot] on_ready callback failed: {}", exc)
        # Trigger the opening greeting by injecting an initial user turn.
        loguru_logger.info("[bot] queuing initial LLMRunFrame for opening greeting")
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_audio_track_subscribed")
    async def on_audio_track_subscribed(transport, participant_id: str):
        loguru_logger.info("[bot] audio track subscribed: {}", participant_id)
        try:
            room = transport._client.room
            user_pub.set_room(room)
            tutor_pub.set_room(room)
        except Exception as exc:
            loguru_logger.warning("[bot] could not set room on audio_track_subscribed: {}", exc)

    @transport.event_handler("on_data_received")
    async def on_data_received(transport, data: bytes, participant_id: str):
        try:
            msg = json.loads(data.decode())
            if msg.get("type") == "user_text":
                text = msg.get("text", "").strip()
                if text:
                    loguru_logger.info("[bot] data channel user_text: {}", text)
                    await task.queue_frames([
                        LLMMessagesAppendFrame(
                            messages=[{"role": "user", "content": text}],
                            run_llm=True,
                        )
                    ])
        except Exception as exc:
            loguru_logger.warning("[bot] data message error: {}", exc)

    @transport.event_handler("on_disconnected")
    async def on_disconnected(transport):
        loguru_logger.warning(
            "[bot] room disconnected — cancelling pipeline: %s",
            room_name,
        )
        await task.cancel()

    @transport.event_handler("on_before_disconnect")
    async def on_before_disconnect(transport):
        loguru_logger.info("[bot] livekit disconnect requested for %s", room_name)

    async def _enforce_max_duration() -> None:
        await asyncio.sleep(MAX_SESSION_SECONDS)
        loguru_logger.info(
            "[bot] %s reached max duration (%ds) — cancelling pipeline",
            room_name,
            MAX_SESSION_SECONDS,
        )
        await task.cancel()

    watchdog = asyncio.create_task(_enforce_max_duration())
    try:
        runner = PipelineRunner()
        await runner.run(task)
    finally:
        if not watchdog.done():
            watchdog.cancel()
            try:
                await watchdog
            except asyncio.CancelledError:
                pass
