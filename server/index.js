const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

gameState = { players: {} };
mice = {};
players = {};

function broadcast(outgoing) {
  wss.clients.forEach((client) => {
    if (client.readyState == WebSocket.OPEN) {
      client.send(JSON.stringify(outgoing));
    }
  });
}
function single(ws, outgoing) {
  ws.send(JSON.stringify(outgoing));
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    msg = JSON.parse(msg);

    switch (msg.action) {
      case "init":
        if (!msg.player_id) {
          player_id = "player " + Object.keys(gameState.players).length;
        } else {
          player_id = msg.player_id;
        }
        gameState.players[player_id] = {
          player_id,
          color: msg.color,
          connection: ws,
          lastMsg: +Date.now(),
        };
        players[player_id] = {
          color: msg.color,
          mousePos: { x: 0, y: 0 },
          lastMsg: +Date.now(),
        };
        single(ws, { action: "init", gameState: gameState, player_id });
        break;
      // case "change_name":
      //   gameState.players[msg.id] =
      case "mousePos":
        if (!players[msg.player_id]) {
          return;
        }
        players[msg.player_id].mousePos = msg.mousePos;
        players[msg.player_id].lastMsg = +Date.now();
        break;
    }
  });
});

setInterval(() => {
  broadcast({ action: "players", players });
}, 300);

const PORT = 8000;
app.get("/", (_req, res) => res.send("hello!"));
server.listen(PORT, () => console.log(`running on port ${PORT}`));
