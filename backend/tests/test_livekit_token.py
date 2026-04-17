"""Tests for utils/livekit_token.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("LIVEKIT_API_KEY", "test-key")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "test-secret")
    monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")


def _make_mock_token(jwt_value: str = "mock.jwt.token"):
    """Return a mock AccessToken chain that produces jwt_value."""
    mock_token = MagicMock()
    mock_token.with_identity.return_value = mock_token
    mock_token.with_name.return_value = mock_token
    mock_token.with_grants.return_value = mock_token
    mock_token.with_ttl.return_value = mock_token
    mock_token.to_jwt.return_value = jwt_value
    return mock_token


class TestCreateParticipantToken:
    def test_returns_string(self):
        with patch("utils.livekit_token.AccessToken", return_value=_make_mock_token("abc.def.ghi")):
            from utils.livekit_token import create_participant_token
            token = create_participant_token("room-1", "alice")
        assert isinstance(token, str)
        assert token == "abc.def.ghi"

    def test_uses_room_name_in_grants(self):
        import utils.livekit_token as lk
        captured = {}
        mock_token = _make_mock_token()

        def capture_grants(grants):
            captured["room"] = grants.room
            return mock_token

        mock_token.with_grants.side_effect = capture_grants

        with patch.object(lk, "AccessToken", return_value=mock_token):
            lk.create_participant_token("my-room", "alice")

        assert captured.get("room") == "my-room"

    def test_uses_api_key_from_env(self, monkeypatch):
        monkeypatch.setenv("LIVEKIT_API_KEY", "custom-key")
        import utils.livekit_token as lk
        captured = {}

        def mock_constructor(api_key, api_secret):
            captured["api_key"] = api_key
            return _make_mock_token()

        with patch.object(lk, "AccessToken", side_effect=mock_constructor):
            lk.create_participant_token("room", "user")

        assert captured.get("api_key") == "custom-key"

    def test_missing_api_key_raises(self, monkeypatch):
        monkeypatch.delenv("LIVEKIT_API_KEY", raising=False)
        with patch("utils.livekit_token.AccessToken", return_value=_make_mock_token()):
            from utils import livekit_token
            import importlib; importlib.reload(livekit_token)
            with pytest.raises(KeyError):
                livekit_token.create_participant_token("room", "user")
