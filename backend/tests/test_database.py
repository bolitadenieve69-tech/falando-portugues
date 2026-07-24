"""Tests for database.py — SQLite persistence layer."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
import pytest_asyncio
import tempfile
import asyncio


@pytest.fixture(autouse=True)
def use_temp_db(monkeypatch, tmp_path):
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DB_PATH", str(db_file))
    # Reload database module to pick up new DB_PATH
    import importlib
    import database
    importlib.reload(database)


@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_init_db_creates_table():
    from database import init_db, DB_PATH
    await init_db()
    assert DB_PATH.exists()


@pytest.mark.asyncio
async def test_register_device_returns_token():
    from database import init_db, register_device
    await init_db()
    token = await register_device("device-001", "Ana", "hash123")
    assert isinstance(token, str)
    assert len(token) == 64  # 32 bytes hex


@pytest.mark.asyncio
async def test_register_device_duplicate_returns_none():
    from database import init_db, register_device
    await init_db()
    await register_device("device-001", "Ana", "hash123")
    result = await register_device("device-001", "Ana2", "hash456")
    assert result is None


@pytest.mark.asyncio
async def test_get_user_by_device_returns_user():
    from database import init_db, register_device, get_user_by_device
    await init_db()
    await register_device("device-002", "Rui", "h")
    user = await get_user_by_device("device-002")
    assert user is not None
    assert user["username"] == "Rui"
    assert user["device_id"] == "device-002"


@pytest.mark.asyncio
async def test_get_user_by_device_missing_returns_none():
    from database import init_db, get_user_by_device
    await init_db()
    result = await get_user_by_device("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_get_user_by_token():
    from database import init_db, register_device, get_user_by_token
    await init_db()
    token = await register_device("device-003", "Sara", "pw")
    user = await get_user_by_token(token)
    assert user is not None
    assert user["username"] == "Sara"


@pytest.mark.asyncio
async def test_expired_token_returns_none():
    import time
    import aiosqlite
    from database import init_db, register_device, get_user_by_token, DB_PATH
    await init_db()
    token = await register_device("device-005", "Eva", "pw")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET token_expires_at = ? WHERE device_id = ?",
            (int(time.time()) - 1, "device-005"),
        )
        await db.commit()
    assert await get_user_by_token(token) is None


@pytest.mark.asyncio
async def test_register_sets_future_expiry():
    import time
    from database import init_db, register_device, get_user_by_device
    await init_db()
    await register_device("device-006", "Nuno", "pw")
    user = await get_user_by_device("device-006")
    assert user["token_expires_at"] > int(time.time())


@pytest.mark.asyncio
async def test_rotate_token_refreshes_expiry():
    import time
    import aiosqlite
    from database import init_db, register_device, rotate_token, get_user_by_token, DB_PATH
    await init_db()
    await register_device("device-007", "Ines", "pw")
    # Simulate an almost-expired token, then login (rotate) refreshes it.
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET token_expires_at = ? WHERE device_id = ?",
            (int(time.time()) + 5, "device-007"),
        )
        await db.commit()
    new_token = await rotate_token("device-007")
    user = await get_user_by_token(new_token)
    assert user is not None
    assert user["token_expires_at"] > int(time.time()) + 5


@pytest.mark.asyncio
async def test_migration_backfills_legacy_tokens():
    """A pre-expiry database gains the column and keeps existing tokens valid."""
    import sqlite3
    import database
    conn = sqlite3.connect(database.DB_PATH)
    conn.execute(
        "CREATE TABLE users ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " device_id TEXT NOT NULL UNIQUE,"
        " username TEXT NOT NULL,"
        " password_hash TEXT NOT NULL,"
        " token TEXT UNIQUE,"
        " created_at INTEGER NOT NULL)"
    )
    conn.execute(
        "INSERT INTO users (device_id, username, password_hash, token, created_at)"
        " VALUES ('legacy-dev', 'Old', 'h', 'legacy-token', 0)"
    )
    conn.commit()
    conn.close()

    await database.init_db()
    user = await database.get_user_by_token("legacy-token")
    assert user is not None
    assert user["username"] == "Old"


@pytest.mark.asyncio
async def test_translation_cache_roundtrip():
    from database import init_db, cache_translation, get_cached_translation
    await init_db()
    assert await get_cached_translation("casa", "pt", "es") is None
    await cache_translation("casa", "pt", "es", "casa")
    assert await get_cached_translation("casa", "pt", "es") == "casa"


@pytest.mark.asyncio
async def test_translation_cache_replaces_existing():
    from database import init_db, cache_translation, get_cached_translation
    await init_db()
    await cache_translation("fixe", "pt", "es", "guay")
    await cache_translation("fixe", "pt", "es", "genial")
    assert await get_cached_translation("fixe", "pt", "es") == "genial"


def _sample_session(session_id: str = "s1", started_at: int = 1000) -> dict:
    return {
        "id": session_id,
        "topic": "viagens",
        "level": "B1",
        "started_at": started_at,
        "ended_at": started_at + 300,
        "duration_seconds": 300,
        "message_count": 12,
        "correction_count": 3,
        "excerpt": "Olá, tudo bem?",
    }


@pytest.mark.asyncio
async def test_save_and_get_session():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions
    await init_db()
    await register_device("dev-sess-1", "Rita", "pw")
    user = await get_user_by_device("dev-sess-1")
    await save_session(user["id"], _sample_session())
    sessions = await get_sessions(user["id"])
    assert len(sessions) == 1
    assert sessions[0]["id"] == "s1"
    assert sessions[0]["topic"] == "viagens"
    assert sessions[0]["correction_count"] == 3


@pytest.mark.asyncio
async def test_get_sessions_orders_newest_first():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions
    await init_db()
    await register_device("dev-sess-2", "Tó", "pw")
    user = await get_user_by_device("dev-sess-2")
    await save_session(user["id"], _sample_session("old", started_at=1000))
    await save_session(user["id"], _sample_session("new", started_at=5000))
    sessions = await get_sessions(user["id"])
    assert [s["id"] for s in sessions] == ["new", "old"]


@pytest.mark.asyncio
async def test_save_session_is_idempotent():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions
    await init_db()
    await register_device("dev-sess-3", "Zé", "pw")
    user = await get_user_by_device("dev-sess-3")
    await save_session(user["id"], _sample_session("dup"))
    await save_session(user["id"], _sample_session("dup"))  # same id
    sessions = await get_sessions(user["id"])
    assert len(sessions) == 1


@pytest.mark.asyncio
async def test_get_sessions_isolates_users():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions
    await init_db()
    await register_device("dev-sess-a", "A", "pw")
    await register_device("dev-sess-b", "B", "pw")
    user_a = await get_user_by_device("dev-sess-a")
    user_b = await get_user_by_device("dev-sess-b")
    await save_session(user_a["id"], _sample_session("a1"))
    assert len(await get_sessions(user_b["id"])) == 0
    assert len(await get_sessions(user_a["id"])) == 1


@pytest.mark.asyncio
async def test_rotate_token_returns_new_token():
    from database import init_db, register_device, rotate_token, get_user_by_token
    await init_db()
    old_token = await register_device("device-004", "Luis", "pw")
    new_token = await rotate_token("device-004")
    assert new_token != old_token
    # Old token no longer valid
    old_user = await get_user_by_token(old_token)
    assert old_user is None
    # New token is valid
    new_user = await get_user_by_token(new_token)
    assert new_user is not None
    assert new_user["username"] == "Luis"
