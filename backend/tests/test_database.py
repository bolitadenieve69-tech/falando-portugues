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
