"""Pipecat pipeline — the AI tutor bot that runs inside a LiveKit room."""

import asyncio
import json
import logging
import os

import aiohttp
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

from deepgram import LiveOptions
from pipecat.frames.frames import (
    Frame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    TextFrame,
    TranscriptionFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsHttpTTSService
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

from prompts.tutor_pt import build_system_prompt


class TranscriptPublisher(FrameProcessor):
    """Intercepts transcript frames and publishes them to the LiveKit data channel.

    Two instances are used in the pipeline:
    - mode="user"  placed after STT — captures TranscriptionFrame (spoken speech)
    - mode="tutor" placed after LLM — captures buffered LLM text output
    """

    def __init__(self, speaker: str, **kwargs):
        super().__init__(**kwargs)
        self._speaker = speaker
        self._room = None
        self._buffer: list[str] = []

    def set_room(self, room) -> None:
        self._room = room

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await self.push_frame(frame, direction)

        if self._room is None:
            return

        if self._speaker == "user" and isinstance(frame, TranscriptionFrame):
            text = (frame.text or "").strip()
            if text:
                await self._publish(text)

        elif self._speaker == "tutor":
            if isinstance(frame, LLMFullResponseStartFrame):
                self._buffer = []
            elif isinstance(frame, TextFrame):
                self._buffer.append(frame.text or "")
            elif isinstance(frame, LLMFullResponseEndFrame):
                full = "".join(self._buffer).strip()
                self._buffer = []
                if full:
                    await self._publish(full)

    async def _publish(self, text: str) -> None:
        try:
            payload = json.dumps(
                {"type": "transcript", "speaker": self._speaker, "text": text}
            ).encode()
            local = self._room.local_participant
            try:
                await local.publish_data(payload, reliable=True)
            except TypeError:
                # Older livekit-rtc API uses keyword `kind` instead of `reliable`
                from livekit import rtc
                await local.publish_data(payload, kind=rtc.DataPacketKind.RELIABLE)
        except Exception as exc:
            logger.warning("[transcript] publish (%s) failed: %s", self._speaker, exc)


class _SerialAnthropicLLM(AnthropicLLMService):
    """Prevents concurrent Anthropic API calls.

    Rapid user interruptions can fire multiple LLMContextFrames before the
    previous LLM response completes, causing HTTP 429 "Number of concurrent
    connections exceeded" errors. This guard drops any context frame that
    arrives while a generation is already in-flight.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._generation_lock = asyncio.Lock()

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, LLMContextFrame):
            if self._generation_lock.locked():
                logger.warning(
                    "[llm-gate] LLM already generating — dropping context frame to prevent 429"
                )
                return  # drop; no await, no state change
            async with self._generation_lock:
                await super().process_frame(frame, direction)
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
    """Run the Pipecat pipeline for a single session.

    Retries up to *max_retries* times on transient connection errors
    (network blips, upstream 5xx from ElevenLabs/Deepgram).
    """
    # Re-read .env on every call so key rotation takes effect without restart.
    load_dotenv(override=True)

    for attempt in range(1, max_retries + 1):
        try:
            await _run_pipeline(room_url, token, room_name, level, topic, voice_id)
            return
        except Exception as exc:
            if attempt < max_retries:
                wait = 2 ** (attempt - 1)  # 1s, 2s, 4s …
                logger.warning(
                    "[bot] Session %s — attempt %d/%d failed (%s). Retrying in %ds…",
                    room_name,
                    attempt,
                    max_retries,
                    exc,
                    wait,
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    "[bot] Session %s — all %d attempts failed. Last error: %s",
                    room_name,
                    max_retries,
                    exc,
                )
                raise


async def _run_pipeline(
    room_url: str,
    token: str,
    room_name: str,
    level: str,
    topic: str,
    voice_id: str,
) -> None:
    """Internal: build and run the Pipecat pipeline once."""

    transport = LiveKitTransport(
        url=room_url,
        token=token,
        room_name=room_name,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    )

    # Increase endpointing to 1000 ms — waits for a full second of silence before
    # declaring end of turn, reducing the false "end of turn" events that caused
    # rapid-fire LLMContextFrames and downstream 429 errors.
    stt = DeepgramSTTService(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        live_options=LiveOptions(
            language="pt",
            model="nova-3-general",
            endpointing=1000,  # ms of silence → end of turn (was 500)
            smart_format=True,
            interim_results=True,
            punctuate=True,
        ),
    )

    system_prompt = build_system_prompt(level=level, topic=topic)
    logger.info("[bot] System prompt (first 120 chars): %s", system_prompt[:120])

    # System message is the first entry; the Anthropic adapter extracts it and
    # passes it to Claude as the `system=` parameter.  Using LLMContext (universal)
    # + LLMContextAggregatorPair so the rest of the pipeline stays service-agnostic.
    llm = _SerialAnthropicLLM(
        api_key=os.environ["ANTHROPIC_API_KEY"],
        model="claude-haiku-4-5-20251001",
        params=AnthropicLLMService.InputParams(max_tokens=256),
    )

    context = LLMContext(
        messages=[
            # Anthropic adapter pulls out the "system" role message and passes it
            # as the system= parameter; it never reaches the model as a user turn.
            {"role": "system", "content": system_prompt},
            # Initial greeting triggers the first tutor response on session start.
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

        pipeline = Pipeline(
            [
                transport.input(),
                stt,
                user_pub,                    # publishes user STT transcript
                context_aggregator.user(),
                llm,
                tutor_pub,                   # publishes tutor LLM response
                tts,
                transport.output(),
                context_aggregator.assistant(),
            ]
        )

        task = PipelineTask(pipeline)

        @transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant_id: str):
            # Give publishers access to the LiveKit room so they can publish data.
            try:
                room = transport._client.room
                user_pub.set_room(room)
                tutor_pub.set_room(room)
            except AttributeError:
                logger.warning("[bot] Could not access LiveKit room for transcript publishing")
            await task.queue_frames([LLMContextFrame(context)])

        @transport.event_handler("on_data_received")
        async def on_data_received(transport, data: bytes, participant_id: str):
            try:
                msg = json.loads(data.decode())
                if msg.get("type") == "user_text":
                    text = msg.get("text", "").strip()
                    if text:
                        context.messages.append({"role": "user", "content": text})
                        await task.queue_frames([LLMContextFrame(context)])
            except Exception as exc:
                logger.warning("[bot] Failed to process data message: %s", exc)

        runner = PipelineRunner()
        await runner.run(task)
