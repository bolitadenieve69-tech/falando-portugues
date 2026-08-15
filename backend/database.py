"""SQLite persistence layer — users, device tokens, and translation cache."""

from __future__ import annotations

import asyncio
import os
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite

DB_PATH = Path(os.environ.get("DB_PATH", "falando.db"))

# Session tokens expire after this many days; login rotates the token and
# refreshes the expiry, so active users are never interrupted.
TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_DAYS", "30")) * 24 * 60 * 60


def _token_expiry() -> int:
    return int(time.time()) + TOKEN_TTL_SECONDS


def _ensure_db_path() -> None:
    if DB_PATH.parent and not DB_PATH.parent.exists():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)


async def _open_connection() -> aiosqlite.Connection:
    _ensure_db_path()
    conn = await aiosqlite.connect(DB_PATH)
    await conn.execute("PRAGMA foreign_keys = ON")
    return conn


_db_init_lock = asyncio.Lock()
_db_initialized = False


async def _ensure_initialized() -> None:
    global _db_initialized
    if _db_initialized:
        return
    async with _db_init_lock:
        if _db_initialized:
            return
        await init_db()
        _db_initialized = True


@asynccontextmanager
async def _connect_db() -> aiosqlite.Connection:
    await _ensure_initialized()
    conn = await _open_connection()
    try:
        yield conn
    finally:
        await conn.close()


async def init_db() -> None:
    _ensure_db_path()
    db = await _open_connection()
    try:
        await db.execute("PRAGMA journal_mode=WAL")
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
    finally:
        await db.close()


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
        async with _connect_db() as db:
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
    async with _connect_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE device_id = ?", (device_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_user_by_token(token: str) -> dict | None:
    async with _connect_db() as db:
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
    async with _connect_db() as db:
        cursor = await db.execute(
            "UPDATE users SET token = ?, token_expires_at = ? WHERE device_id = ?",
            (new_token, _token_expiry(), device_id),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise ValueError(f"device not found: {device_id}")
    return new_token


async def get_cached_translation(
    word: str, from_lang: str, to_lang: str
) -> str | None:
    async with _connect_db() as db:
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
    async with _connect_db() as db:
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


async def save_session(user_id: int, record: dict) -> bool:
    """Persist a completed session.

    Uses an atomic SQLite upsert that only updates an existing row when the
    existing `user_id` matches the caller's `user_id`. If the row exists but
    belongs to a different user, the operation is rejected and no change is
    applied. Returns True when the row was inserted or updated, False when
    rejected due to ownership conflict.
    """
    async with _connect_db() as db:
        cursor = await db.execute(
            """
            INSERT INTO sessions
              (id, user_id, topic, level, started_at, ended_at,
               duration_seconds, message_count, correction_count, excerpt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              topic = excluded.topic,
              level = excluded.level,
              started_at = excluded.started_at,
              ended_at = excluded.ended_at,
              duration_seconds = excluded.duration_seconds,
              message_count = excluded.message_count,
              correction_count = excluded.correction_count,
              excerpt = excluded.excerpt
            WHERE sessions.user_id = excluded.user_id
            RETURNING id
            """,
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
        row = await cursor.fetchone()
        await db.commit()

        # If RETURNING produced no row, the conflict WHERE-clause prevented
        # the update because the existing row belonged to a different user.
        if row is None:
            return False
        return True


async def get_sessions(user_id: int, limit: int = 50) -> list[dict]:
    """Return the user's sessions, newest first."""
    async with _connect_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            f"SELECT {', '.join(_SESSION_COLUMNS)} FROM sessions"
            " WHERE user_id = ? ORDER BY started_at DESC LIMIT ?",
            (user_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
