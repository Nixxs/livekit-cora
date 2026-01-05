import { useRef, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [textToSend, setTextToSend] = useState("");

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Accumulate partial assistant text for current turn
  const currentAssistantTextRef = useRef("");
  const currentAssistantIndexRef = useRef(null);

  // Accumulate partial user transcript for current speech segment
  const currentUserTextRef = useRef("");
  const currentUserIndexRef = useRef(null);

  const log = (msg) => setLogs((l) => [...l, `[${new Date().toISOString()}] ${msg}`]);

  const addLine = (role, text) => {
    setTranscript((prev) => [...prev, { role, text }]);
  };

  const upsertPartial = (role, text) => {
    setTranscript((prev) => {
      const ref = role === "assistant" ? currentAssistantIndexRef : currentUserIndexRef;
      if (ref.current == null) {
        const next = [...prev, { role, text }];
        ref.current = next.length - 1;
        return next;
      }
      const idx = ref.current;
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  };

  const finalizeTurn = (role) => {
    if (role === "assistant") {
      currentAssistantIndexRef.current = null;
      currentAssistantTextRef.current = "";
    } else {
      currentUserIndexRef.current = null;
      currentUserTextRef.current = "";
    }
  };

  const handleRealtimeEvent = (raw) => {
    let evt;
    try {
      evt = JSON.parse(raw);
    } catch {
      // Not all events are JSON, but most are. Log non-json lightly.
      log(`event(non-json): ${raw}`);
      return;
    }

    const t = evt.type;

    // --- USER SPEECH TRANSCRIPTION ---
    // Final user transcript arrives here when input_audio_transcription is enabled.
    // Event: conversation.item.input_audio_transcription.completed :contentReference[oaicite:2]{index=2}
    if (t === "conversation.item.input_audio_transcription.completed") {
      const userText = evt.transcript;
      if (typeof userText === "string" && userText.trim()) {
        addLine("user", userText.trim());
      }
      finalizeTurn("user");
      return;
    }

    if (t === "response.audio_transcript.delta") {
      const delta = evt.delta;
      if (typeof delta === "string" && delta.length) {
        currentAssistantTextRef.current += delta;
        upsertPartial("assistant", currentAssistantTextRef.current);
      }
      return;
    }

    if (t === "response.audio_transcript.done") {
      finalizeTurn("assistant");
      return;
    }

    // Catch-all (useful when debugging event types)
    // log(`event: ${t}`);
  };

  const start = async () => {
    try {
      setStatus("starting");
      log("Requesting ephemeral session from backend...");

      const sessResp = await fetch("http://localhost:8000/session");
      const sess = await sessResp.json();

      if (!sessResp.ok) {
        log(`Backend error: ${JSON.stringify(sess)}`);
        setStatus("error");
        return;
      }

      const ephemeralKey = sess.client_secret;
      const model = sess.model || "gpt-realtime";
      log(`Got ephemeral token. Model=${model}`);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => log(`pc.connectionState=${pc.connectionState}`);

      pc.ontrack = (event) => {
        log("Received remote track");
        const [stream] = event.streams;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      };

      log("Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        log("DataChannel open");

        // IMPORTANT: opt-in to user audio transcription
        // session.update supports input_audio_transcription (e.g., whisper-1) :contentReference[oaicite:4]{index=4}
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: {
              input_audio_transcription: { model: "whisper-1" },
              // If you want strict VAD behaviour, you can set this too:
              // turn_detection: { type: "server_vad" }
            },
          })
        );
        log("Sent session.update (enable input_audio_transcription).");

        // Kick off greeting (request BOTH audio and text so transcript has assistant text)
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions: "Greet the user and ask how you can help. Only ever speak in english.",
            },
          })
        );
        log("Sent response.create (hello).");
      };

      dc.onclose = () => log("DataChannel closed");
      dc.onerror = (e) => log(`DataChannel error: ${String(e)}`);
      dc.onmessage = (m) => handleRealtimeEvent(m.data);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      log("Sending SDP offer to OpenAI Realtime...");

      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      const answerSdp = await sdpResp.text();
      if (!sdpResp.ok) {
        log(`OpenAI SDP error: ${answerSdp}`);
        setStatus("error");
        return;
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("connected");
      log("Connected.");
    } catch (e) {
      log(`Error: ${String(e)}`);
      setStatus("error");
    }
  };

  const stop = async () => {
    setStatus("stopping");
    log("Stopping...");

    try {
      if (dcRef.current) {
        try { dcRef.current.close(); } catch { }
        dcRef.current = null;
      }
      if (pcRef.current) {
        try { pcRef.current.getSenders().forEach((s) => s.track && s.track.stop()); } catch { }
        try { pcRef.current.close(); } catch { }
        pcRef.current = null;
      }
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    } finally {
      setStatus("idle");
      log("Stopped.");
    }
  };

  const sendText = () => {
    const dc = dcRef.current;
    const text = textToSend.trim();
    if (!dc || dc.readyState !== "open" || !text) return;

    addLine("user", text);
    setTextToSend("");

    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      })
    );

    dc.send(
      JSON.stringify({
        type: "response.create",
        response: { modalities: ["audio", "text"] },
      })
    );

    log("Sent user text + response.create");
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", maxWidth: 1100 }}>
      <h2>OpenAI Realtime (WebRTC) – Voice + Transcript</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <button onClick={start} disabled={status !== "idle"}>Start</button>
        <button onClick={stop} disabled={status === "idle"}>Stop</button>
        <div style={{ marginLeft: 12 }}>
          <strong>Status:</strong> {status}
        </div>
      </div>

      <audio ref={remoteAudioRef} autoPlay />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <h3>Transcript</h3>
          <div
            style={{
              background: "#0f0f0f",
              color: "#e6e6e6",
              padding: 12,
              borderRadius: 8,
              minHeight: 320,
              maxHeight: 520,
              overflow: "auto",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
            }}
          >
            {transcript.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No transcript yet.</div>
            ) : (
              transcript.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 700 }}>{m.role === "user" ? "You" : "Assistant"}:</span>{" "}
                  <span>{m.text}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={textToSend}
              onChange={(e) => setTextToSend(e.target.value)}
              placeholder="Type a message (optional)..."
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
              disabled={status !== "connected"}
            />
            <button onClick={sendText} disabled={status !== "connected" || !textToSend.trim()}>
              Send
            </button>
          </div>
        </div>

        <div>
          <h3>Logs</h3>
          <pre
            style={{
              background: "#111",
              color: "#ddd",
              padding: 12,
              borderRadius: 8,
              overflow: "auto",
              maxHeight: 620,
              minHeight: 320,
              whiteSpace: "pre-wrap",
            }}
          >
            {logs.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  );
}



