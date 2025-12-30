import os
import json
import asyncio
from dotenv import load_dotenv

from livekit import api as lkapi
from livekit import rtc

load_dotenv()

LIVEKIT_URL = os.environ["LIVEKIT_URL"]
LIVEKIT_API_KEY = os.environ["LIVEKIT_API_KEY"]
LIVEKIT_API_SECRET = os.environ["LIVEKIT_API_SECRET"]

ROOM_NAME = os.getenv("DEV_ROOM", "dev-room")
AGENT_IDENTITY = os.getenv("AGENT_IDENTITY", "agent-cora")


def mint_token(room: str, identity: str) -> str:
    token = lkapi.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    token.identity = identity
    token.with_grants(
        lkapi.VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
        )
    )
    return token.to_jwt()


def make_event(event_type: str, payload: dict) -> bytes:
    evt = {
        "v": 1,
        "id": os.urandom(8).hex(),
        "ts": int(asyncio.get_running_loop().time() * 1000),
        "type": event_type,
        "payload": payload,
    }
    return json.dumps(evt).encode("utf-8")


async def main():
    token = mint_token(ROOM_NAME, AGENT_IDENTITY)

    room = rtc.Room()
    await room.connect(LIVEKIT_URL, token)
    print(f"[agent] connected to room={ROOM_NAME} as {AGENT_IDENTITY}")

    @room.on("data_received")
    def on_data(packet: rtc.DataPacket):
        try:
            evt = json.loads(packet.data.decode("utf-8"))
        except Exception:
            return

        if evt.get("type") != "user_text":
            return

        text = (evt.get("payload") or {}).get("text", "")
        sender = packet.participant.identity if packet.participant else "unknown"

        md = (
            f"Received from **{sender}**:\n\n"
            f"> {text}\n\n"
            "```python\n"
            "def hello(name: str) -> str:\n"
            '    return f"Hello, {name}!"\n\n'
            'print(hello("LiveKit"))\n'
            "```\n"
        )

        asyncio.create_task(
            room.local_participant.publish_data(
                make_event("assistant_markdown", {"markdown": md}),
                reliable=True,
            )
        )

    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
