import os
from typing import Any, Dict

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load env vars from .env (optional). You can remove this if you prefer pure OS env vars.
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

# You can override these with env vars if you want
REALTIME_MODEL = os.getenv("REALTIME_MODEL", "gpt-realtime")
REALTIME_VOICE = os.getenv("REALTIME_VOICE", "marin")

app = FastAPI(title="Realtime Ephemeral Token Service")

# Adjust this for your dev setup
# If you're running Vite on http://localhost:5173, allow that origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}

@app.get("/session")
async def create_session() -> Dict[str, Any]:
    """
    Creates an ephemeral Realtime session and returns the client_secret needed by the browser.
    """
    url = "https://api.openai.com/v1/realtime/sessions"
    payload = {
        "model": REALTIME_MODEL,
        "voice": REALTIME_VOICE,
        # Optional: default system instructions for the session
        "instructions": "You are a helpful voice AI assistant that nick is programming, you don't have any programmed tools yet and you speak only in englinsh.",
        # Optional: configure audio formats, turn detection, etc. later via session.update
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, headers=headers, json=payload)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to reach OpenAI: {e}")

    data = resp.json()
    if resp.status_code >= 400:
        # Bubble up OpenAI error payload for debugging
        raise HTTPException(status_code=resp.status_code, detail=data)

    # Typical response includes: { client_secret: { value: "..." }, ... }
    client_secret = (data.get("client_secret") or {}).get("value")
    if not client_secret:
        raise HTTPException(status_code=500, detail={"error": "No client_secret returned", "raw": data})

    return {
        "client_secret": client_secret,
        "model": REALTIME_MODEL,
        "voice": REALTIME_VOICE,
    }

