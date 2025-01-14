const fs = require("fs");
const webSocket = require("ws");

function saveDataToFile(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filePath}`);
}

const sendData = (url, data) => {
  const ws = new webSocket(url);
  ws.on("open", () => {
    console.log("Connected to WebSocket server. Sending data...");
    ws.send(JSON.stringify(data));
    ws.close();
  });
  ws.on("message", (message) => {
    console.log("Received from server:", message);
  });
  ws.on("error", (err) => console.error("WebSocket error:", err));
};

const waitFor = (timeout) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });

module.exports = { saveDataToFile, waitFor, sendData };
