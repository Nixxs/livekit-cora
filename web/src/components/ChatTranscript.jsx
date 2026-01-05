import { Box, Typography } from '@mui/material';
import RenderMessage from '../components/RenderMessage';

export default function ChatTranscript({transcript}){
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Box
        sx={{
          background: "#0f0f0f",
          color: "#e6e6e6",
          padding: 3,
          borderRadius: 1,
          minHeight: 320,
          maxHeight: 520,
          overflow: "auto",
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
        }}
      >
        {transcript.length === 0 ? (
          <Box
            sx={{
              opacity: 0.7
            }}
          >
            No transcript yet.
          </Box>
        ) : (
          transcript.map((m, i) => (
            <Box
              key={i}
              sx={{
                mb: 1
              }}
            >
              <span style={{ fontWeight: 700 }}>{m.role === "user" ? "You" : "Assistant"}:</span>{" "}
              <RenderMessage text={m.text} />
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}
