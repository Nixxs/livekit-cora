from livekit import api as lkapi


def mint_room_token(
    *,
    api_key: str,
    api_secret: str,
    room: str,
    identity: str,
    can_publish: bool = True,
    can_subscribe: bool = True,
) -> str:
    """
    Create a LiveKit JWT allowing a user/agent to join a specific room.

    Notes:
    - This must run server-side because it requires the API secret.
    - Keep tokens short-lived in production (we'll add TTL later if needed).
    """
    token = lkapi.AccessToken(api_key, api_secret)
    token.identity = identity

    token.with_grants(
        lkapi.VideoGrants(
            room_join=True,
            room=room,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
        )
    )

    return token.to_jwt()
