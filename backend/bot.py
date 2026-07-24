"""Pipecat pipeline — the AI tutor bot that runs inside a LiveKit room."""

import asyncio
import json
import logging
import os

import aiohttp
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
from pipecat.services.elevenlabs.tts import ElevenLabsHttpTTSService
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

from prompts.tutor_pt import build_system_prompt
from utils.corrections import parse_correction

# Hard cap on session length so an abandoned session cannot keep consuming
# Deepgram/Anthropic/ElevenLabs indefinitely.
MAX_SESSION_SECONDS = int(os.environ.get("MAX_SESSION_MINUTES", "30")) * 60


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

    Drops LLMContextFrames that arrive while a generation is already in-flight
    to avoid HTTP 429 errors from rapid user interruptions.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._generation_lock = asyncio.Lock()

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, LLMContextFrame):
            loguru_logger.info("[llm] LLMContextFrame received — lock={}", self._generation_lock.locked())
            if self._generation_lock.locked():
                loguru_logger.warning("[llm-gate] already generating — dropping frame")
                return
            async with self._generation_lock:
                loguru_logger.info("[llm] generation started")
                await super().process_frame(frame, direction)
                loguru_logger.info("[llm] generation complete")
        else:
            await super().process_frame(frame, direction)


async def run_bot(
    room_url: str,
    token: str,
    room_name: str = "tutor-room",
    level: str = "B1",
    topic: str = "livre",
    voice_id: str = "DMcOknq8n1B6XshFIJKJ",
    max_retries: int = 3,
) -> None:
    load_dotenv(override=True)

    for attempt in range(1, max_retries + 1):
        try:
            await _run_pipeline(room_url, token, room_name, level, topic, voice_id)
            return
        except Exception as exc:
            if attempt < max_retries:
                wait = 2 ** (attempt - 1)
                logger.warning(
                    "[bot] %s — attempt %d/%d failed (%s). Retrying in %ds…",
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
) -> None:
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
            language="pt",
            model="nova-3-general",
            endpointing=1000,
            smart_format=True,
            interim_results=True,
            punctuate=True,
        ),
    )

    system_prompt = build_system_prompt(level=level, topic=topic)
    logger.info("[bot] prompt[:120]: %s", system_prompt[:120])

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

    async with aiohttp.ClientSession() as session:
        tts = ElevenLabsHttpTTSService(
            api_key=os.environ["ELEVENLABS_API_KEY"],
            voice_id=voice_id,
            aiohttp_session=session,
            model="eleven_multilingual_v2",
        )

        pipeline = Pipeline([
            transport.input(),
            stt,
            user_pub,
            context_aggregator.user(),
            llm,
            tutor_pub,
            tts,
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

        async def _enforce_max_duration() -> None:
            await asyncio.sleep(MAX_SESSION_SECONDS)
            loguru_logger.info(
                "[bot] {} reached max duration ({}s) — cancelling pipeline",
                room_name, MAX_SESSION_SECONDS,
            )
            await task.cancel()

        watchdog = asyncio.create_task(_enforce_max_duration())
        try:
            runner = PipelineRunner()
            await runner.run(task)
        finally:
            watchdog.cancel()
