"""SQLite persistence layer — users and device tokens."""

from __future__ import annotations

import os
import secrets
import time
from pathlib import Path
from typing import Optional

import aiosqlite

DB_PATH = Path(os.environ.get("DB_PATH", "falando.db"))


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id     TEXT    NOT NULL UNIQUE,
                username      TEXT    NOT NULL,
                password_hash TEXT    NOT NULL,
                token         TEXT    UNIQUE,
                created_at    INTEGER NOT NULL
            )
        """)
        await db.commit()


async def register_device(
    device_id: str, username: str, password_hash: str
) -> str | None:
    """Create a new user. Returns the session token, or None if device already exists."""
    token = secrets.token_hex(32)
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO users (device_id, username, password_hash, token, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (device_id, username, password_hash, token, int(time.time())),
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
            "SELECT * FROM users WHERE token = ?", (token,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def rotate_token(device_id: str) -> str:
    """Issue a fresh token for the device (called on every login)."""
    new_token = secrets.token_hex(32)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET token = ? WHERE device_id = ?", (new_token, device_id)
        )
        await db.commit()
    return new_token
