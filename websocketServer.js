const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("new socket connected.");
  ws.on("message", (data) => {
    if (Buffer.isBuffer(data)) {
      // Convert buffer to string if the data is a buffer
      const dataString = data.toString();
      console.log("Received data:", dataString);
    } else {
      // If data is already a string, log it directly
      console.log("Received data:", data);
    }
  });

  ws.on("close", () => console.log("MT5 EA disconnected."));
});

console.log("WebSocket server running on ws://localhost:8080");
