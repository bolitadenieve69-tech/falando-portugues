"""FastAPI server — entry point for the Falando Portugues backend."""

import asyncio
import os
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.livekit_token import create_participant_token

load_dotenv()

app = FastAPI(title="Falando Portugues Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionRequest(BaseModel):
    level: str = "B1"
    topic: str = "livre"
    participant_name: str = "user"
    voice_id: str = "DMcOknq8n1B6XshFIJKJ"


class SessionResponse(BaseModel):
    room_name: str
    token: str
    livekit_url: str


@app.post("/session", response_model=SessionResponse)
async def create_session(req: SessionRequest) -> SessionResponse:
    """Create a LiveKit room, spawn Pipecat bot, return token to mobile client."""
    room_name = f"tutor-{uuid.uuid4().hex[:8]}"

    try:
        # Token for the mobile user
        user_token = create_participant_token(room_name, req.participant_name)
        # Token for the Pipecat bot
        bot_token = create_participant_token(room_name, "tutor-bot")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Missing env var: {e}")

    livekit_url = os.environ["LIVEKIT_URL"]

    # Spawn Pipecat bot in background (non-blocking)
    asyncio.create_task(
        _spawn_bot(
            room_url=livekit_url,
            token=bot_token,
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


async def _spawn_bot(room_url: str, token: str, level: str, topic: str, voice_id: str = "DMcOknq8n1B6XshFIJKJ") -> None:
    """Run the Pipecat bot pipeline for this session."""
    try:
        from bot import run_bot
        await run_bot(room_url=room_url, token=token, level=level, topic=topic, voice_id=voice_id)
    except Exception as e:
        print(f"[bot] Error in session: {e}")


class TranslateRequest(BaseModel):
    word: str
    from_lang: str = "pt"
    to_lang: str = "es"


class TranslateResponse(BaseModel):
    word: str
    translation: str


@app.post("/translate", response_model=TranslateResponse)
async def translate_word(req: TranslateRequest) -> TranslateResponse:
    """Translate a single Portuguese word to Spanish using Claude."""
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=64,
        messages=[{
            "role": "user",
            "content": (
                f"Translate the Portuguese word '{req.word}' to Spanish. "
                "Reply with ONLY the translation, nothing else. "
                "If it has multiple meanings, give the most common one."
            ),
        }],
    )
    translation = message.content[0].text.strip()
    return TranslateResponse(word=req.word, translation=translation)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
