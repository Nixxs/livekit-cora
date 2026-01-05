import { Box } from "@mui/material";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function RenderMessage({ text }) {
  // Split on ``` blocks
  const parts = text.split(/```/);

  return (
    <>
      {parts.map((part, i) => {
        // Odd indices are code blocks
        if (i % 2 === 1) {
          // Optional language support: ```js
          const match = part.match(/^(\w+)\n([\s\S]*)$/);
          const language = match ? match[1] : "javascript";
          const code = match ? match[2] : part;

          return (
            <Box key={i} sx={{ my: 0, mb: -3 }}>
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {code.trim()}
              </SyntaxHighlighter>
            </Box>
          );
        }

        // Normal text
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {part}
          </span>
        );
      })}
    </>
  );
}

