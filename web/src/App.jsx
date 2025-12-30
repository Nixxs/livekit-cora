import { useEffect, useMemo, useState, useCallback } from "react";
import {
  LiveKitRoom,
  ControlBar,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";

import Transcript from "./Transcript";
import Composer from "./Composer";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/**
 * Data message "envelope" used between UI and agent (and later tools).
 * Keep this stable early; it makes everything else easy.
 */
function makeEvent(type, payload) {
  return {
    v: 1,
    id: crypto.randomUUID(),
    ts: Date.now(),
    type,
    payload,
  };
}

async function createSession(userId) {
  const res = await fetch(`${API_BASE}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, room:"dev-room" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session error (${res.status}): ${text}`);
  }
  return res.json(); // { room, identity, token }
}

function ChatPanel({ identity }) {
  const room = useRoomContext();

  const [events, setEvents] = useState([]);

  // Receive data messages
  useEffect(() => {
    if (!room) return;

    const onData = (payload, participant, kind) => {
      try {
        const text = new TextDecoder().decode(payload);
        const evt = JSON.parse(text);

        // Basic sanity check
        if (!evt || !evt.type) return;

        setEvents((prev) => [...prev, { ...evt, from: participant?.identity }]);
      } catch {
        // Ignore non-JSON messages for now
      }
    };

    room.on("dataReceived", onData);
    return () => room.off("dataReceived", onData);
  }, [room]);

  // Send typed messages as data events
  const sendUserText = useCallback(
    async (text) => {
      if (!room) return;
      const evt = makeEvent("user_text", { text });

      const bytes = new TextEncoder().encode(JSON.stringify(evt));
      // RELIABLE ensures ordered delivery for chat-like events
      room.localParticipant.publishData(bytes, { reliable: true });

      // Optimistically add to transcript so user sees it immediately
      setEvents((prev) => [...prev, { ...evt, from: identity }]);
    },
    [room, identity]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        <Transcript events={events} localIdentity={identity} />
      </div>

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Composer onSend={sendUserText} />
      </div>

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <ControlBar controls={{ camera: false, screenShare: false }} />
        <RoomAudioRenderer />
      </div>
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState("nick");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  const connect = async () => {
    setError("");
    try {
      const s = await createSession(userId.trim());
      setSession(s);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const disconnect = () => setSession(null);

  return (
    <div style={{ height: "100vh" }}>
      {!session ? (
        <div style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
          <h2>LiveKit Cora</h2>
          <p>Start a session to join a LiveKit Cloud room.</p>

          <label style={{ display: "block", marginBottom: 8 }}>
            User ID
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <button onClick={connect} style={{ padding: "10px 14px" }}>
            Start session
          </button>

          {error && (
            <pre style={{ marginTop: 12, color: "salmon", whiteSpace: "pre-wrap" }}>
              {error}
            </pre>
          )}
        </div>
      ) : (
        <LiveKitRoom
          token={session.token}
          serverUrl={undefined /* token contains grants; serverUrl still required below */}
          connect={true}
          audio={true}
          video={false}
          options={{ adaptiveStream: true, dynacast: true }}
          // IMPORTANT: LiveKitRoom needs the serverUrl separately
          // We'll pass it via import.meta.env or hardcode in next step.
          // For now, set it once in a helper component below.
        >
          <ServerUrlWrapper session={session} onDisconnect={disconnect} />
        </LiveKitRoom>
      )}
    </div>
  );
}

/**
 * LiveKitRoom requires serverUrl. Keep it separate so the join UI stays clean.
 */
function ServerUrlWrapper({ session, onDisconnect }) {
  // Put your LiveKit Cloud URL in web/.env as VITE_LIVEKIT_URL
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div style={{ padding: 16 }}>
        <h3>Missing VITE_LIVEKIT_URL</h3>
        <p>
          Add <code>VITE_LIVEKIT_URL</code> to <code>web/.env</code> with your LiveKit
          Cloud URL.
        </p>
        <button onClick={onDisconnect} style={{ padding: "10px 14px" }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onDisconnect}
      options={{ adaptiveStream: true, dynacast: true }}
      style={{ height: "100%" }}
    >
      <ChatPanel identity={session.identity} />
    </LiveKitRoom>
  );
}
