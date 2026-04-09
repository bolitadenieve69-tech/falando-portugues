"""LiveKit access token generation."""

import os
import time
from livekit.api import AccessToken, VideoGrants


def create_participant_token(room_name: str, participant_name: str) -> str:
    """Create a LiveKit access token for a participant joining a room."""
    api_key = os.environ["LIVEKIT_API_KEY"]
    api_secret = os.environ["LIVEKIT_API_SECRET"]

    grants = VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    )

    token = (
        AccessToken(api_key=api_key, api_secret=api_secret)
        .with_identity(participant_name)
        .with_name(participant_name)
        .with_grants(grants)
        .with_ttl(3600)  # 1 hour
        .to_jwt()
    )

    return token
