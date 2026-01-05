
import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import RenderMessage from "../components/RenderMessage";

export default function ChatTranscript({ transcript }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Always scroll to bottom when transcript updates
    el.scrollTop = el.scrollHeight;
  }, [transcript]);

  return (
    <Box
      ref={scrollRef}
      sx={{
        background: "black",
        color: "#e6e6e6",
        p: 3,
        borderRadius: 1,
        lineHeight: 1.4,
        overflow: "auto",
        minHeight: 0,
        flex: 1,
        maxHeight: "100%"
      }}
    >
      {transcript.length === 0 ? (
        <Box sx={{ 
          opacity: 0.7,
        }}>
          <Typography>
            No transcript yet.
          </Typography>
        </Box>
      ) : (
        transcript.map((m, i) => (
          <Box key={i} sx={{ mb: 1 }}>
            <Typography component="span" sx={{ fontWeight: 700 }}>
              {m.role === "user" ? "You" : "Assistant"}:
            </Typography>{" "}
            <RenderMessage text={m.text} />
          </Box>
        ))
      )}
    </Box>
  );
}

