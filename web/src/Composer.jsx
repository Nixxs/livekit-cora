import { useState } from "react";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await onSend(t);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        style={{ flex: 1, padding: 10 }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button onClick={send} style={{ padding: "10px 14px" }}>
        Send
      </button>
    </div>
  );
}


