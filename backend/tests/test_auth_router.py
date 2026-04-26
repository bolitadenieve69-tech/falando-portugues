"""Tests for auth_router.py — /auth/register and /auth/login endpoints."""

import os
import bcrypt
import pytest
from unittest.mock import AsyncMock, patch

# Ensure required env vars are set before importing main
_TEST_ENV = {
    "ANTHROPIC_API_KEY": "test-anthropic-key",
    "DEEPGRAM_API_KEY": "test-deepgram-key",
    "ELEVENLABS_API_KEY": "test-elevenlabs-key",
    "LIVEKIT_URL": "wss://test.livekit.cloud",
    "LIVEKIT_API_KEY": "test-livekit-key",
    "LIVEKIT_API_SECRET": "test-livekit-secret",
}
for _k, _v in _TEST_ENV.items():
    if not os.environ.get(_k):
        os.environ[_k] = _v

from fastapi.testclient import TestClient
import main  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)

# ── Test data ─────────────────────────────────────────────────────────────────

DEVICE_ID = "device-test-12345678"
USERNAME = "Tester"
PASSWORD = "senha123"

_STORED_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

MOCK_USER = {
    "id": 1,
    "device_id": DEVICE_ID,
    "username": USERNAME,
    "password_hash": _STORED_HASH,
}

REGISTER_BODY = {"device_id": DEVICE_ID, "username": USERNAME, "password": PASSWORD}
LOGIN_BODY = {"device_id": DEVICE_ID, "password": PASSWORD}


# ── /auth/register ────────────────────────────────────────────────────────────

class TestRegister:
    def test_successful_registration(self):
        with (
            patch("auth_router.get_user_by_device", new_callable=AsyncMock) as mock_get,
            patch("auth_router.register_device", new_callable=AsyncMock) as mock_reg,
        ):
            mock_get.return_value = None
            mock_reg.return_value = "new-token-abc"
            resp = client.post("/auth/register", json=REGISTER_BODY)
        assert resp.status_code == 200
        body = resp.json()
        assert body["token"] == "new-token-abc"
        assert body["username"] == USERNAME

    def test_duplicate_device_returns_409(self):
        with patch("auth_router.get_user_by_device", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MOCK_USER
            resp = client.post("/auth/register", json=REGISTER_BODY)
        assert resp.status_code == 409
        assert "já tem uma conta" in resp.json()["detail"]

    def test_device_id_too_short_returns_422(self):
        body = {**REGISTER_BODY, "device_id": "short"}
        resp = client.post("/auth/register", json=body)
        assert resp.status_code == 422

    def test_password_too_short_returns_422(self):
        body = {**REGISTER_BODY, "password": "123"}
        resp = client.post("/auth/register", json=body)
        assert resp.status_code == 422

    def test_invalid_username_characters_returns_422(self):
        body = {**REGISTER_BODY, "username": "hacker<script>"}
        resp = client.post("/auth/register", json=body)
        assert resp.status_code == 422

    def test_username_too_short_returns_422(self):
        body = {**REGISTER_BODY, "username": "x"}
        resp = client.post("/auth/register", json=body)
        assert resp.status_code == 422

    def test_register_device_returns_none_gives_409(self):
        with (
            patch("auth_router.get_user_by_device", new_callable=AsyncMock) as mock_get,
            patch("auth_router.register_device", new_callable=AsyncMock) as mock_reg,
        ):
            mock_get.return_value = None
            mock_reg.return_value = None  # Simulate race condition / DB conflict
            resp = client.post("/auth/register", json=REGISTER_BODY)
        assert resp.status_code == 409


# ── /auth/login ───────────────────────────────────────────────────────────────

class TestLogin:
    def test_successful_login(self):
        with (
            patch("auth_router.get_user_by_device", new_callable=AsyncMock) as mock_get,
            patch("auth_router.rotate_token", new_callable=AsyncMock) as mock_rotate,
        ):
            mock_get.return_value = MOCK_USER
            mock_rotate.return_value = "rotated-token-xyz"
            resp = client.post("/auth/login", json=LOGIN_BODY)
        assert resp.status_code == 200
        body = resp.json()
        assert body["token"] == "rotated-token-xyz"
        assert body["username"] == USERNAME

    def test_unregistered_device_returns_404(self):
        with patch("auth_router.get_user_by_device", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            resp = client.post("/auth/login", json=LOGIN_BODY)
        assert resp.status_code == 404
        assert "não registado" in resp.json()["detail"]

    def test_wrong_password_returns_401(self):
        with patch("auth_router.get_user_by_device", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MOCK_USER
            body = {**LOGIN_BODY, "password": "wrongpassword"}
            resp = client.post("/auth/login", json=body)
        assert resp.status_code == 401
        assert "incorreta" in resp.json()["detail"]

    def test_device_id_too_short_returns_422(self):
        body = {**LOGIN_BODY, "device_id": "short"}
        resp = client.post("/auth/login", json=body)
        assert resp.status_code == 422

    def test_password_too_short_returns_422(self):
        body = {**LOGIN_BODY, "password": "abc"}
        resp = client.post("/auth/login", json=body)
        assert resp.status_code == 422
