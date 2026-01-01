import { useState } from "react";
import ChatRoom from "./ChatRoom";


export default function App() {
  const [userId, setUserId] = useState("nick");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  async function createSession(userId) {
    const res = await fetch(`${API_BASE}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, room: "dev-room" }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Session error (${res.status}): ${text}`);
    }
    return res.json(); // { room, identity, token }
  }

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
            Start Session
          </button>

          {error && (
            <pre style={{ marginTop: 12, color: "salmon", whiteSpace: "pre-wrap" }}>
              {error}
            </pre>
          )}
        </div>
      ) : (
        <ChatRoom session={session} onDisconnect={disconnect} />
      )}
    </div>
  );
}
