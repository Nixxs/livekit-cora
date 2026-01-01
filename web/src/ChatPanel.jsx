import { useEffect, useState, useCallback } from "react";
import {
  ControlBar,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";

import Transcript from "./Transcript";
import Composer from "./Composer";


export default function ChatPanel({ identity }) {
  const room = useRoomContext();

  const [events, setEvents] = useState([]);

  function makeEvent(type, payload) {
    return {
      v: 1,
      id: crypto.randomUUID(),
      ts: Date.now(),
      type,
      payload,
    };
  }

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
