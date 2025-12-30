import os
import uuid
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.livekit_tokens import mint_room_token

load_dotenv()


def _required_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return v


LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

# In dev, allow your local web app to call the API from the browser.
# In prod, set this to your real web origin(s).
WEB_ORIGIN = os.getenv("WEB_ORIGIN", "http://localhost:5173")

app = FastAPI(title="LiveKit Session API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[WEB_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateSessionRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    room: str | None = Field(default=None, max_length=256)
    display_name: str | None = Field(default=None, max_length=128)
    room_prefix: str = Field(default="sess", max_length=32)


class CreateSessionResponse(BaseModel):
    room: str
    identity: str
    token: str


class MintTokenRequest(BaseModel):
    identity: str = Field(..., min_length=1, max_length=128)
    room: str = Field(..., min_length=1, max_length=256)
    name: str | None = Field(default=None, max_length=128)


class MintTokenResponse(BaseModel):
    token: str


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/session", response_model=CreateSessionResponse)
def create_session(req: CreateSessionRequest):
    """
    Create a new room name and return a token for the user to join that room.

    This is the endpoint your UI should call first:
      - UI -> POST /session { user_id }
      - API -> { room, identity, token }
      - UI uses token to connect to LiveKit
    """
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(
            status_code=500, detail="LiveKit credentials not configured"
        )

    room = req.room or f"{req.room_prefix}-{uuid.uuid4().hex}"
    # Identity should be stable per user within the session. For now, keep it simple:
    identity = f"user-{req.user_id}"

    token = mint_room_token(
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET,
        room=room,
        identity=identity,
        can_publish=True,
        can_subscribe=True,
    )

    return CreateSessionResponse(room=room, identity=identity, token=token)


@app.post("/token", response_model=MintTokenResponse)
def mint_token(req: MintTokenRequest):
    """
    Optional: mint a token for a specific identity+room. Useful for testing or later flows.
    In most cases the UI will call /session instead.
    """
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(
            status_code=500, detail="LiveKit credentials not configured"
        )

    token = mint_room_token(
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET,
        room=req.room,
        identity=req.identity,
        can_publish=True,
        can_subscribe=True,
    )
    return MintTokenResponse(token=token)
