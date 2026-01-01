import {
  LiveKitRoom
} from "@livekit/components-react";
import ChatPanel from "./ChatPanel";


export default function ChatRoom({ session, onDisconnect }) {
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
