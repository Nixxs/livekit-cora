import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function isAssistantMarkdown(evt) {
  return evt?.type === "assistant_markdown" && evt?.payload?.markdown;
}

function isUserText(evt) {
  return evt?.type === "user_text" && evt?.payload?.text;
}

export default function Transcript({ events, localIdentity }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {events.map((evt) => {
        const from = evt.from || "unknown";
        const isLocal = from === localIdentity;

        return (
          <div
            key={evt.id}
            style={{
              alignSelf: isLocal ? "flex-end" : "flex-start",
              maxWidth: "900px",
              width: "fit-content",
              padding: 12,
              borderRadius: 10,
              background: isLocal
                ? "rgba(122, 162, 247, 0.15)"
                : "rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>
              {from}
            </div>

            {isAssistantMarkdown(evt) ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {evt.payload.markdown}
              </ReactMarkdown>
            ) : isUserText(evt) ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{evt.payload.text}</div>
            ) : (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(evt, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

