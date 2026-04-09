"""Pipecat pipeline — the AI tutor bot that runs inside a LiveKit room."""

import asyncio
import os
from dotenv import load_dotenv

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.services.anthropic import AnthropicLLMService
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.transports.services.livekit import LiveKitTransport, LiveKitParams
from pipecat.processors.aggregators.llm_response import LLMAssistantResponseAggregator, LLMUserResponseAggregator
from pipecat.frames.frames import LLMMessagesFrame

from prompts.tutor_pt import build_system_prompt

load_dotenv()


async def run_bot(room_url: str, token: str, level: str = "B1", topic: str = "livre", voice_id: str = "DMcOknq8n1B6XshFIJKJ") -> None:
    """Run the Pipecat pipeline for a single session."""
    transport = LiveKitTransport(
        url=room_url,
        token=token,
        room_name="tutor-room",
        params=LiveKitParams(audio_out_enabled=True, transcription_enabled=True),
    )

    stt = DeepgramSTTService(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        language="pt",
    )

    llm = AnthropicLLMService(
        api_key=os.environ["ANTHROPIC_API_KEY"],
        model="claude-haiku-4-5-20251001",
        system=build_system_prompt(level=level, topic=topic),
    )

    tts = ElevenLabsTTSService(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        voice_id=voice_id,
        model="eleven_multilingual_v2",
    )

    messages = [
        {
            "role": "user",
            "content": "Olá! Estou pronto para praticar português.",
        }
    ]

    tl = LLMAssistantResponseAggregator(messages)
    ul = LLMUserResponseAggregator(messages)

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            ul,
            llm,
            tts,
            transport.output(),
            tl,
        ]
    )

    task = PipelineTask(pipeline, PipelineParams(allow_interruptions=True))

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        transport.capture_participant_transcription(participant["id"])
        await task.queue_frames([LLMMessagesFrame(messages)])

    runner = PipelineRunner()
    await runner.run(task)
