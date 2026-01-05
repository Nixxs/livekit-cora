import { Box, Typography, Button } from '@mui/material';

export default function ChatControls({
  start, 
  stop, 
  status
}){
  return (
    <Box>
      <Typography
        component="p"
        variant="h5"
        align="left"
        sx={{ 
            fontWeight: 600, 
            mb: 0,
        }}
      >
        CORA - Voice + Transcript
      </Typography>
      <Box
        sx={{
          mt: 1,
          mb: 1,
          display: "flex",
          flexDirection: "row"
        }}
      >
        <Button
          variant="contained"
          onClick={start} 
          disabled={status !== "idle"}
          sx={{
            mr: 1,
            width: "100px" 
          }}
        >
          Start
        </Button>
        <Button 
          variant="outlined"
          onClick={stop} 
          disabled={status === "idle"}
          sx={{
            width: "80px"
          }}
        >
          Stop
        </Button>
      </Box>
      <Box>
        <Typography
          sx={{
            fontSize: 16
          }} 
        >
          <Typography 
            component="span" 
            fontWeight="bold"
            sx={{
              fontSize: 16
            }}
          >
            status: {" "} 
          </Typography>
          {status}
        </Typography>
      </Box>
    </Box>
  );
}
