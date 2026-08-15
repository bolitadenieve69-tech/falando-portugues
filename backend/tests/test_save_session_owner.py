"""Tests for session ownership semantics in save_session."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
import pytest_asyncio


def _sample_session(session_id: str = "owner-s1", started_at: int = 1000, excerpt: str = "orig") -> dict:
    return {
        "id": session_id,
        "topic": "viagens",
        "level": "B1",
        "started_at": started_at,
        "ended_at": started_at + 300,
        "duration_seconds": 300,
        "message_count": 12,
        "correction_count": 3,
        "excerpt": excerpt,
    }


@pytest.mark.asyncio
async def test_new_session_saved():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions

    await init_db()
    token = await register_device("dev-owner-1", "Owner1", "pw")
    user = await get_user_by_device("dev-owner-1")

    success = await save_session(user["id"], _sample_session("s-new", 2000, "first"))
    assert success is True
    sessions = await get_sessions(user["id"])
    assert len(sessions) == 1
    assert sessions[0]["id"] == "s-new"


@pytest.mark.asyncio
async def test_same_user_can_update():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions

    await init_db()
    await register_device("dev-owner-2", "Owner2", "pw")
    user = await get_user_by_device("dev-owner-2")

    rec1 = _sample_session("s-upd", 3000, "first")
    assert await save_session(user["id"], rec1)

    # Update same id with same user
    rec2 = _sample_session("s-upd", 3000, "updated")
    assert await save_session(user["id"], rec2)

    sessions = await get_sessions(user["id"])
    assert len(sessions) == 1
    assert sessions[0]["excerpt"] == "updated"


@pytest.mark.asyncio
async def test_other_user_cannot_overwrite_and_original_preserved():
    from database import init_db, register_device, get_user_by_device, save_session, get_sessions

    await init_db()
    await register_device("dev-owner-3", "Owner3", "pw")
    await register_device("dev-other-1", "Other1", "pw")
    owner = await get_user_by_device("dev-owner-3")
    other = await get_user_by_device("dev-other-1")

    # Owner creates session
    orig = _sample_session("s-conflict", 4000, "original")
    assert await save_session(owner["id"], orig)

    # Other user attempts to overwrite same id
    attack = _sample_session("s-conflict", 4000, "malicious")
    success = await save_session(other["id"], attack)
    assert success is False

    # Verify owner still has original content and other has no session
    owner_sessions = await get_sessions(owner["id"])
    other_sessions = await get_sessions(other["id"])

    assert len(owner_sessions) == 1
    assert owner_sessions[0]["excerpt"] == "original"
    assert all(s["id"] != "s-conflict" for s in other_sessions)
