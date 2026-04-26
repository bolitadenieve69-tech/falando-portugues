"""Shared pytest configuration — stubs out heavy dependencies (pipecat, loguru)
so bot.py can be imported in a plain Python environment without the full Pipecat
install that requires the ARM venv.
"""

import sys
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock


def _make_module(name: str, **attrs) -> ModuleType:
    m = ModuleType(name)
    for k, v in attrs.items():
        setattr(m, k, v)
    return m


# ── Loguru stub ───────────────────────────────────────────────────────────────

loguru_logger = MagicMock()
loguru_logger.info = MagicMock()
loguru_logger.warning = MagicMock()

loguru_mod = _make_module("loguru", logger=loguru_logger)
sys.modules.setdefault("loguru", loguru_mod)

# ── aiohttp stub ──────────────────────────────────────────────────────────────
# Only stub aiohttp if the real package is not installed; otherwise the stub
# would break livekit.api which needs aiohttp.ClientSession at class-definition time.
try:
    import aiohttp as _real_aiohttp  # noqa: F401 — keep real module
except ImportError:
    sys.modules.setdefault("aiohttp", _make_module("aiohttp"))

# ── Pipecat frame stubs ───────────────────────────────────────────────────────

class _BaseFrame:
    pass

class Frame(_BaseFrame): pass
class TextFrame(_BaseFrame):
    def __init__(self, text: str = ""):
        self.text = text
class TranscriptionFrame(_BaseFrame):
    def __init__(self, text: str = "", user_id: str = "", timestamp: str = ""):
        self.text = text
class LLMContextFrame(_BaseFrame): pass
class LLMFullResponseStartFrame(_BaseFrame): pass
class LLMFullResponseEndFrame(_BaseFrame): pass
class LLMMessagesAppendFrame(_BaseFrame): pass
class LLMRunFrame(_BaseFrame): pass
class UserStoppedSpeakingFrame(_BaseFrame): pass

frames_mod = _make_module(
    "pipecat.frames.frames",
    Frame=Frame,
    TextFrame=TextFrame,
    TranscriptionFrame=TranscriptionFrame,
    LLMContextFrame=LLMContextFrame,
    LLMFullResponseStartFrame=LLMFullResponseStartFrame,
    LLMFullResponseEndFrame=LLMFullResponseEndFrame,
    LLMMessagesAppendFrame=LLMMessagesAppendFrame,
    LLMRunFrame=LLMRunFrame,
    UserStoppedSpeakingFrame=UserStoppedSpeakingFrame,
)

# ── Pipecat processor stubs ───────────────────────────────────────────────────

class FrameDirection:
    DOWNSTREAM = "downstream"
    UPSTREAM = "upstream"

class IdentityFilter:
    """Minimal stub — enough for TranscriptPublisher to subclass."""
    async def process_frame(self, frame, direction):
        pass

    async def push_frame(self, frame, direction=None):
        pass

class AnthropicLLMService:
    def __init__(self, *args, **kwargs):
        pass
    async def process_frame(self, frame, direction):
        pass

class LLMContext:
    pass

class LLMContextAggregatorPair:
    pass

class DeepgramSTTService:
    def __init__(self, *args, **kwargs):
        pass

class LiveOptions:
    pass

class ElevenLabsHttpTTSService:
    def __init__(self, *args, **kwargs):
        pass

class Pipeline:
    def __init__(self, *args, **kwargs):
        pass

class PipelineRunner:
    def __init__(self, *args, **kwargs):
        pass
    async def run(self, *args, **kwargs):
        pass

class PipelineTask:
    def __init__(self, *args, **kwargs):
        pass

class LiveKitTransport:
    def __init__(self, *args, **kwargs):
        pass
    def input(self): return MagicMock()
    def output(self): return MagicMock()

class LiveKitParams:
    def __init__(self, *args, **kwargs):
        pass


# Register all pipecat stubs before any test imports bot.py
_PIPECAT_STUBS = {
    "pipecat": _make_module("pipecat"),
    "pipecat.frames": _make_module("pipecat.frames"),
    "pipecat.frames.frames": frames_mod,
    "pipecat.pipeline": _make_module("pipecat.pipeline"),
    "pipecat.pipeline.pipeline": _make_module("pipecat.pipeline.pipeline", Pipeline=Pipeline),
    "pipecat.pipeline.runner": _make_module("pipecat.pipeline.runner", PipelineRunner=PipelineRunner),
    "pipecat.pipeline.task": _make_module("pipecat.pipeline.task", PipelineTask=PipelineTask),
    "pipecat.processors": _make_module("pipecat.processors"),
    "pipecat.processors.aggregators": _make_module("pipecat.processors.aggregators"),
    "pipecat.processors.aggregators.llm_context": _make_module(
        "pipecat.processors.aggregators.llm_context", LLMContext=LLMContext
    ),
    "pipecat.processors.aggregators.llm_response_universal": _make_module(
        "pipecat.processors.aggregators.llm_response_universal",
        LLMContextAggregatorPair=LLMContextAggregatorPair,
    ),
    "pipecat.processors.filters": _make_module("pipecat.processors.filters"),
    "pipecat.processors.filters.identity_filter": _make_module(
        "pipecat.processors.filters.identity_filter", IdentityFilter=IdentityFilter
    ),
    "pipecat.processors.frame_processor": _make_module(
        "pipecat.processors.frame_processor", FrameDirection=FrameDirection
    ),
    "pipecat.services": _make_module("pipecat.services"),
    "pipecat.services.anthropic": _make_module("pipecat.services.anthropic"),
    "pipecat.services.anthropic.llm": _make_module(
        "pipecat.services.anthropic.llm", AnthropicLLMService=AnthropicLLMService
    ),
    "pipecat.services.deepgram": _make_module("pipecat.services.deepgram"),
    "pipecat.services.deepgram.stt": _make_module(
        "pipecat.services.deepgram.stt",
        DeepgramSTTService=DeepgramSTTService,
        LiveOptions=LiveOptions,
    ),
    "pipecat.services.elevenlabs": _make_module("pipecat.services.elevenlabs"),
    "pipecat.services.elevenlabs.tts": _make_module(
        "pipecat.services.elevenlabs.tts", ElevenLabsHttpTTSService=ElevenLabsHttpTTSService
    ),
    "pipecat.transports": _make_module("pipecat.transports"),
    "pipecat.transports.livekit": _make_module("pipecat.transports.livekit"),
    "pipecat.transports.livekit.transport": _make_module(
        "pipecat.transports.livekit.transport",
        LiveKitTransport=LiveKitTransport,
        LiveKitParams=LiveKitParams,
    ),
}

for name, mod in _PIPECAT_STUBS.items():
    sys.modules.setdefault(name, mod)
