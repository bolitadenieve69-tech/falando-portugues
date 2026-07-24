"""SQLite persistence layer — users, device tokens, and translation cache."""

from __future__ import annotations

import os
import secrets
import time
from pathlib import Path

import aiosqlite

DB_PATH = Path(os.environ.get("DB_PATH", "falando.db"))

# Session tokens expire after this many days; login rotates the token and
# refreshes the expiry, so active users are never interrupted.
TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_DAYS", "30")) * 24 * 60 * 60


def _token_expiry() -> int:
    return int(time.time()) + TOKEN_TTL_SECONDS


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id        TEXT    NOT NULL UNIQUE,
                username         TEXT    NOT NULL,
                password_hash    TEXT    NOT NULL,
                token            TEXT    UNIQUE,
                token_expires_at INTEGER,
                created_at       INTEGER NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS translations (
                word        TEXT    NOT NULL,
                from_lang   TEXT    NOT NULL,
                to_lang     TEXT    NOT NULL,
                translation TEXT    NOT NULL,
                created_at  INTEGER NOT NULL,
                PRIMARY KEY (word, from_lang, to_lang)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id               TEXT    PRIMARY KEY,
                user_id          INTEGER NOT NULL,
                topic            TEXT    NOT NULL,
                level            TEXT    NOT NULL,
                started_at       INTEGER NOT NULL,
                ended_at         INTEGER NOT NULL,
                duration_seconds INTEGER NOT NULL,
                message_count    INTEGER NOT NULL,
                correction_count INTEGER NOT NULL,
                excerpt          TEXT    NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_user"
            " ON sessions (user_id, started_at DESC)"
        )
        await _migrate_token_expiry(db)
        await db.commit()


async def _migrate_token_expiry(db: aiosqlite.Connection) -> None:
    """Add token_expires_at to pre-existing databases and backfill live tokens."""
    async with db.execute("PRAGMA table_info(users)") as cursor:
        columns = {row[1] for row in await cursor.fetchall()}
    if "token_expires_at" not in columns:
        await db.execute("ALTER TABLE users ADD COLUMN token_expires_at INTEGER")
        await db.execute(
            "UPDATE users SET token_expires_at = ? WHERE token IS NOT NULL",
            (_token_expiry(),),
        )


async def register_device(
    device_id: str, username: str, password_hash: str
) -> str | None:
    """Create a new user. Returns the session token, or None if device already exists."""
    token = secrets.token_hex(32)
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO users"
                " (device_id, username, password_hash, token, token_expires_at, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (device_id, username, password_hash, token, _token_expiry(), int(time.time())),
            )
            await db.commit()
        return token
    except aiosqlite.IntegrityError:
        return None


async def get_user_by_device(device_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE device_id = ?", (device_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_user_by_token(token: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE token = ? AND token_expires_at > ?",
            (token, int(time.time())),
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def rotate_token(device_id: str) -> str:
    """Issue a fresh token for the device (called on every login)."""
    new_token = secrets.token_hex(32)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET token = ?, token_expires_at = ? WHERE device_id = ?",
            (new_token, _token_expiry(), device_id),
        )
        await db.commit()
    return new_token


async def get_cached_translation(
    word: str, from_lang: str, to_lang: str
) -> str | None:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT translation FROM translations"
            " WHERE word = ? AND from_lang = ? AND to_lang = ?",
            (word, from_lang, to_lang),
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else None


async def cache_translation(
    word: str, from_lang: str, to_lang: str, translation: str
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO translations"
            " (word, from_lang, to_lang, translation, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (word, from_lang, to_lang, translation, int(time.time())),
        )
        await db.commit()


# ── Session history ─────────────────────────────────────────────────────────

_SESSION_COLUMNS = (
    "id", "topic", "level", "started_at", "ended_at",
    "duration_seconds", "message_count", "correction_count", "excerpt",
)


async def save_session(user_id: int, record: dict) -> None:
    """Persist a completed session. Idempotent on session id (upsert)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO sessions"
            " (id, user_id, topic, level, started_at, ended_at,"
            "  duration_seconds, message_count, correction_count, excerpt)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record["id"],
                user_id,
                record["topic"],
                record["level"],
                record["started_at"],
                record["ended_at"],
                record["duration_seconds"],
                record["message_count"],
                record["correction_count"],
                record["excerpt"],
            ),
        )
        await db.commit()


async def get_sessions(user_id: int, limit: int = 50) -> list[dict]:
    """Return the user's sessions, newest first."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            f"SELECT {', '.join(_SESSION_COLUMNS)} FROM sessions"
            " WHERE user_id = ? ORDER BY started_at DESC LIMIT ?",
            (user_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
