"""FastAPI server — entry point for the Falando Portugues backend."""

import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv(override=True)

# ── Startup env validation ────────────────────────────────────────────────────

_REQUIRED_ENV_VARS = [
    "ANTHROPIC_API_KEY",
    "DEEPGRAM_API_KEY",
    "ELEVENLABS_API_KEY",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
]


def _validate_env() -> None:
    missing = [v for v in _REQUIRED_ENV_VARS if not os.environ.get(v)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )


_validate_env()

# ── App lifecycle ─────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    from database import init_db
    await init_db()
    logger.info("Database ready")
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Falando Portugues Backend", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from auth_router import router as auth_router
app.include_router(auth_router)

_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-App-Token", "Authorization"],
)

# ── Auth dependencies ─────────────────────────────────────────────────────────

_APP_TOKEN = os.environ.get("APP_TOKEN", "")
_bearer = HTTPBearer(auto_error=False)


async def require_app_token(x_app_token: str = Header(default="")) -> None:
    if _APP_TOKEN and x_app_token != _APP_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing X-App-Token")


async def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token de acesso necessário")
    from database import get_user_by_token
    user = await get_user_by_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return user


# ── Input models ──────────────────────────────────────────────────────────────

_DEFAULT_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "DMcOknq8n1B6XshFIJKJ")

_VALID_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}
_VALID_TOPICS = {"viagens", "trabalho", "familia", "comida", "cultura", "livre"}
_KNOWN_VOICE_IDS = {
    "c0rzOw18hxEhaSybUod2",
    "nJ5NFqyKb8kn9JBPmo6i",
    "DMcOknq8n1B6XshFIJKJ",
}


class SessionRequest(BaseModel):
    level: str = "B1"
    topic: str = "livre"
    participant_name: str = Field(default="user", max_length=32)
    voice_id: str = _DEFAULT_VOICE_ID

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        if v not in _VALID_LEVELS:
            raise ValueError(f"level must be one of {sorted(_VALID_LEVELS)}")
        return v

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        if v not in _VALID_TOPICS:
            raise ValueError(f"topic must be one of {sorted(_VALID_TOPICS)}")
        return v

    @field_validator("voice_id")
    @classmethod
    def validate_voice_id(cls, v: str) -> str:
        if v not in _KNOWN_VOICE_IDS:
            raise ValueError("unknown voice_id")
        return v

    @field_validator("participant_name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return v.strip() or "user"


class SessionResponse(BaseModel):
    room_name: str
    token: str
    livekit_url: str


class TranslateRequest(BaseModel):
    word: str = Field(max_length=60)
    from_lang: str = "pt"
    to_lang: str = "es"

    @field_validator("word")
    @classmethod
    def sanitize_word(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("word cannot be empty")
        return cleaned


class TranslateResponse(BaseModel):
    word: str
    translation: str


class SessionRecord(BaseModel):
    id: str = Field(min_length=1, max_length=128)
    topic: str
    level: str
    started_at: int
    ended_at: int
    duration_seconds: int = Field(ge=0)
    message_count: int = Field(ge=0)
    correction_count: int = Field(ge=0)
    excerpt: str = Field(default="", max_length=200)

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        if v not in _VALID_LEVELS:
            raise ValueError(f"level must be one of {sorted(_VALID_LEVELS)}")
        return v

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        if v not in _VALID_TOPICS:
            raise ValueError(f"topic must be one of {sorted(_VALID_TOPICS)}")
        return v


class SessionListResponse(BaseModel):
    sessions: list[SessionRecord]


# ── Endpoints ─────────────────────────────────────────────────────────────────

from utils.livekit_token import create_participant_token


@app.post(
    "/session",
    response_model=SessionResponse,
    dependencies=[Depends(require_app_token)],
)
@limiter.limit("5/minute")
async def create_session(
    request: Request,
    req: SessionRequest,
    user: dict = Depends(require_user),
) -> SessionResponse:
    room_name = f"tutor-{uuid.uuid4().hex[:8]}"

    try:
        user_token = create_participant_token(room_name, req.participant_name)
        bot_token = create_participant_token(room_name, "tutor-bot")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Missing env var: {e}")

    livekit_url = os.environ["LIVEKIT_URL"]

    asyncio.create_task(
        _spawn_bot(
            room_url=livekit_url,
            token=bot_token,
            room_name=room_name,
            level=req.level,
            topic=req.topic,
            voice_id=req.voice_id,
        )
    )

    return SessionResponse(
        room_name=room_name,
        token=user_token,
        livekit_url=livekit_url,
    )


async def _spawn_bot(
    room_url: str,
    token: str,
    room_name: str,
    level: str,
    topic: str,
    voice_id: str = "DMcOknq8n1B6XshFIJKJ",
) -> None:
    _log = logging.getLogger("bot.spawn")
    try:
        from bot import run_bot
        _log.info("Starting bot room=%s level=%s topic=%s", room_name, level, topic)
        await run_bot(
            room_url=room_url,
            token=token,
            room_name=room_name,
            level=level,
            topic=topic,
            voice_id=voice_id,
        )
        _log.info("Bot finished room=%s", room_name)
    except Exception as exc:
        _log.exception("Bot crashed room=%s: %s", room_name, exc)


@app.post(
    "/translate",
    response_model=TranslateResponse,
    dependencies=[Depends(require_app_token)],
)
@limiter.limit("30/minute")
async def translate_word(
    request: Request,
    req: TranslateRequest,
    user: dict = Depends(require_user),
) -> TranslateResponse:
    import anthropic
    from database import cache_translation, get_cached_translation

    word_key = req.word.lower()
    cached = await get_cached_translation(word_key, req.from_lang, req.to_lang)
    if cached is not None:
        return TranslateResponse(word=req.word, translation=cached)

    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=64,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Translate the Portuguese word '{req.word}' to Spanish. "
                    "Reply with ONLY the translation, nothing else. "
                    "If it has multiple meanings, give the most common one."
                ),
            }
        ],
    )
    translation = message.content[0].text.strip()
    if translation:
        await cache_translation(word_key, req.from_lang, req.to_lang, translation)
    return TranslateResponse(word=req.word, translation=translation)


@app.post(
    "/sessions",
    dependencies=[Depends(require_app_token)],
)
@limiter.limit("30/minute")
async def save_session_endpoint(
    request: Request,
    record: SessionRecord,
    user: dict = Depends(require_user),
) -> dict:
    from database import save_session

    await save_session(user["id"], record.model_dump())
    return {"status": "ok"}


@app.get(
    "/sessions",
    response_model=SessionListResponse,
    dependencies=[Depends(require_app_token)],
)
@limiter.limit("30/minute")
async def list_sessions_endpoint(
    request: Request,
    user: dict = Depends(require_user),
) -> SessionListResponse:
    from database import get_sessions

    rows = await get_sessions(user["id"])
    return SessionListResponse(sessions=[SessionRecord(**row) for row in rows])


_VOICE_PREVIEW_TEXT = {
    "c0rzOw18hxEhaSybUod2": "Olá! Sou o Tiago, o teu tutor de português europeu.",
    "nJ5NFqyKb8kn9JBPmo6i": "Olá! Sou a Joana, a tua tutora de português europeu.",
    "DMcOknq8n1B6XshFIJKJ": "Olá! Sou o Patrício, o teu tutor de português europeu.",
}
_DEFAULT_PREVIEW_TEXT = "Olá! Sou o teu tutor de português europeu."


@app.get(
    "/voice-preview/{voice_id}",
    dependencies=[Depends(require_app_token)],
)
@limiter.limit("10/minute")
async def voice_preview(
    request: Request,
    voice_id: str,
    user: dict = Depends(require_user),
) -> Response:
    if voice_id not in _KNOWN_VOICE_IDS:
        raise HTTPException(status_code=400, detail="Unknown voice_id")

    text = _VOICE_PREVIEW_TEXT.get(voice_id, _DEFAULT_PREVIEW_TEXT)
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="ElevenLabs TTS failed")

    return Response(content=resp.content, media_type="audio/mpeg")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
