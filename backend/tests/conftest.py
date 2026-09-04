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
class TTSAudioRawFrame(_BaseFrame):
    def __init__(self, audio: bytes = b""):
        self.audio = audio

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
    TTSAudioRawFrame=TTSAudioRawFrame,
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
    class InputParams:
        def __init__(self, *args, **kwargs):
            pass

    def __init__(self, *args, **kwargs):
        pass

    async def process_frame(self, frame, direction):
        pass

class LLMContext:
    def __init__(self, *args, **kwargs):
        pass

class LLMContextAggregatorPair:
    def __init__(self, *args, **kwargs):
        pass

    def user(self):
        return MagicMock()

    def assistant(self):
        return MagicMock()

class DeepgramSTTService:
    def __init__(self, *args, **kwargs):
        pass

class LiveOptions:
    def __init__(self, *args, **kwargs):
        pass

class ElevenLabsTTSService:
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



class SmartTurnParams:
    def __init__(self, *args, **kwargs):
        self.stop_secs = kwargs.get("stop_secs")

class LocalSmartTurnAnalyzerV3:
    def __init__(self, *args, **kwargs):
        self.params = kwargs.get("params")

class SpeechTimeoutUserTurnStopStrategy:
    def __init__(self, *args, **kwargs):
        self.user_speech_timeout = kwargs.get("user_speech_timeout")

class TurnAnalyzerUserTurnStopStrategy:
    def __init__(self, *args, **kwargs):
        self.turn_analyzer = kwargs.get("turn_analyzer")

class UserTurnStrategies:
    def __init__(self, *args, **kwargs):
        self.stop = kwargs.get("stop")

class LLMUserAggregatorParams:
    def __init__(self, *args, **kwargs):
        self.user_turn_strategies = kwargs.get("user_turn_strategies")



class VADParams:
    def __init__(self, *args, **kwargs):
        self.stop_secs = kwargs.get("stop_secs")

class SileroVADAnalyzer:
    def __init__(self, *args, **kwargs):
        self.params = kwargs.get("params")


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
        LLMUserAggregatorParams=LLMUserAggregatorParams,
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
        "pipecat.services.elevenlabs.tts", ElevenLabsTTSService=ElevenLabsTTSService
    ),
    "pipecat.audio": _make_module("pipecat.audio"),
    "pipecat.audio.turn": _make_module("pipecat.audio.turn"),
    "pipecat.audio.turn.smart_turn": _make_module("pipecat.audio.turn.smart_turn"),
    "pipecat.audio.turn.smart_turn.base_smart_turn": _make_module(
        "pipecat.audio.turn.smart_turn.base_smart_turn",
        SmartTurnParams=SmartTurnParams,
    ),
    "pipecat.audio.turn.smart_turn.local_smart_turn_v3": _make_module(
        "pipecat.audio.turn.smart_turn.local_smart_turn_v3",
        LocalSmartTurnAnalyzerV3=LocalSmartTurnAnalyzerV3,
    ),
    "pipecat.audio.vad": _make_module("pipecat.audio.vad"),
    "pipecat.audio.vad.silero": _make_module(
        "pipecat.audio.vad.silero", SileroVADAnalyzer=SileroVADAnalyzer
    ),
    "pipecat.audio.vad.vad_analyzer": _make_module(
        "pipecat.audio.vad.vad_analyzer", VADParams=VADParams
    ),
    "pipecat.turns": _make_module("pipecat.turns"),
    "pipecat.turns.user_stop": _make_module(
        "pipecat.turns.user_stop",
        TurnAnalyzerUserTurnStopStrategy=TurnAnalyzerUserTurnStopStrategy,
        SpeechTimeoutUserTurnStopStrategy=SpeechTimeoutUserTurnStopStrategy,
    ),
    "pipecat.turns.user_turn_strategies": _make_module(
        "pipecat.turns.user_turn_strategies",
        UserTurnStrategies=UserTurnStrategies,
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


import pytest


@pytest.fixture(autouse=True)
def _clear_rate_limits():
    """Give every test the full rate-limit budget.

    Without this, tests share one counter: whichever /session test happens to
    run sixth gets a 429 and fails for a reason that has nothing to do with
    what it is checking.
    """
    try:
        import main

        main.limiter.reset()
    except Exception:
        pass
    yield
