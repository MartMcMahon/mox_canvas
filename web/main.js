import "./style.css";

let colors = ["red", "green", "blue", "yellow", "orange", "purple"];

let canvas = document.createElement("canvas");
canvas.width = window.innerWidth - 200;
canvas.height = window.innerHeight - 200;
document.querySelector("#app").appendChild(canvas);
let ctx = canvas.getContext("2d");

let left_ui = document.querySelector("#left_ui");
left_ui.style.margin = "24px";
let name_label = document.createElement("label");
name_label.innerHTML = "name: ";
let name_input = document.createElement("input");
name_input.setAttribute("type", "text");
let name_submit = document.createElement("button");
name_submit.innerHTML = "submit";
// let name_div = document.createElement("div");
// name_div.style.display = "flex";
// name_div.style.flexDirection = "row";
left_ui.appendChild(name_label);
left_ui.appendChild(name_input);
left_ui.appendChild(name_submit);

let deck_div = document.querySelector("#deck");
let deck_input = document.createElement("textarea");
let deck_submit = document.createElement("button");
deck_submit.innerHTML = "submit";
deck_div.appendChild(deck_input)
deck_div.appendChild(deck_submit)

name_submit.addEventListener("click", (e) => {
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        action: "change_name",
        id: name_input.value,
      })
    );
  }
});

let appState = "loading";
let player_id = "";
let gameState = {};
let mice = {};
let deck = [];

deck_submit.addEventListener("click", (e) => {
  deck = deck_input.value.split("\n");
});

////// connection
let socketUrl = "ws://localhost:8000";
let ws = new WebSocket(socketUrl);
ws.onmessage = (e) => {
  let msg = JSON.parse(e.data);
  switch (msg.action) {
    case "init":
      player_id = msg.player_id;
      gameState = msg.gameState;
      appState = "playing";
      console.log(player_id)
      break;
    case "mice":
      mice = msg.mice;
      break;
  }
};
ws.onopen = (e) => {
  ws.send(
    JSON.stringify({
      action: "init",
      msg: "hello",
      color: colors[Math.floor(Math.random() * colors.length)],
    })
  );
};

let secondsPassed = 0;
let oldTimeStamp = 0;
let frameRate = 0;

let mousePos = { x: 0, y: 0 };
function gameLoop(timeStamp) {
  secondsPassed = (timeStamp - oldTimeStamp) / 1000;
  oldTimeStamp = timeStamp;

  // Pass the time to the update
  update(secondsPassed);
  draw();

  window.requestAnimationFrame(gameLoop);
}
let startTime = new Date();
gameLoop(startTime);

function update(secondsPassed) {
  frameRate = 1 / secondsPassed;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTime(ctx);
  drawMice(ctx);
}

function drawMice(ctx) {
  Object.entries(mice).forEach(([id, mouse]) => {
    let color = gameState.players[id].color;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 3, 0, 2 * Math.PI, false)
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  });
}

function drawTime(ctx) {
  let elapsed = parseInt((new Date() - startTime) / 1000);
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "red";
  ctx.font = "14px Verdana";
  ctx.fillText(elapsed + " secs", canvas.width - 75, 25);
  ctx.fillText(frameRate + " fps", canvas.width - 75, 50);
  ctx.fillText(
    "{ " + mousePos.x + ", " + mousePos.y + " }",
    canvas.width - 175,
    75
  );
  ctx.restore();
}

window.addEventListener("mousemove", (e) => {
  mousePos.x = e.x;
  mousePos.y = e.y;
});

window.setInterval(() => {
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        action: "mousePos",
        player_id,
        mousePos,
      })
    );
  }
}, 100);