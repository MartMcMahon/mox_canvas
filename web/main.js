import "./style.css";

let colors = ["red", "green", "blue", "yellow", "orange", "purple"];

// game globals
let appState = "loading";
let player_id = "";
let gameState = {};
let mice = {};
let players = {};
let deck = [];
let hand;
let battlefield = [];

let selected_div = document.querySelector("#selected");
let hand_div = document.querySelector("#hand");

class Card {
  static width = 63;
  static height = 88;

  constructor(name) {
    this.name = name;
    this.x = 0;
    this.y = 0;
  }
  async img() {
    if (!this.api_data) {
      return this.fetch().then((_) => {
        return this.api_data.image_uris.small;
      });
    } else {
      return this.api_data.image_uris.small;
    }
  }
  async fetch() {
    console.log("calling fetch for " + this.name);
    return fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${this.name}`
    ).then((res) => {
      this.api_data = res.json();
    });
  }
  toString() {
    return this.name;
  }

  render(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.closePath();
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.font = "14px Verdana";
    ctx.fillText(this.name, this.x + 10, this.y + 20);
    ctx.closePath();
    ctx.restore();
  }
}

class Deck {
  from_moxfield_list(list) {
    let cards = [];
    let re = /(?<count>\d+) (?<name>.+) \((?<set_code>.+)\) (?<id>.+)/g;
    let matches = re.exec(list);
    while (matches) {
      cards.push(new Card(matches[2]));
      matches = re.exec(list);
    }
    let deck = new Deck();
    deck.cards = cards;
    return deck;
  }
}

class Hand {
  constructor() {
    this.cards = [];
  }
  render() {
    console.log("rendering hand", this.cards);
    hand_div.innerHTML = "";
    for (let i = this.cards.length - 1; i >= 0; i--) {
      let card = this.cards[i];
      let card_div = document.createElement("div");
      card_div.appendChild(document.createElement("img"));
      card_div.style.border = "1px solid black";
      let play_button = document.createElement("button");
      play_button.innerHTML = "↑";
      play_button.addEventListener("click", (_) => {
        card.x = battlefield.length * Card.width;
        card.y = battlefield.length * Card.height;
        console.log("moving " + card.name + " to the battlefield");
        battlefield.push(card);
        this.cards.splice(i, 1);
        this.render();
      });
      hand_div.append(card_div, play_button);

      card.api_data.then((data) => {
        card_div.firstChild.src = data.image_uris.small;
        card_div.addEventListener("click", (e) => {
          console.log(card);
          selected_div.innerHTML =
            "<img src='" + data.image_uris.normal + "' width='300px'></img>";
        });
      });
    }
  }
}
hand = new Hand();

let canvas = document.createElement("canvas");
canvas.width = window.innerWidth - 200;
canvas.height = window.innerHeight - 200;
document.querySelector("#app").appendChild(canvas);
let ctx = canvas.getContext("2d");

let deck_input = document.querySelector("#deck_input");
let deck_submit = document.querySelector("#deck_submit");
deck_submit.addEventListener("click", (e) => {
  deck = new Deck().from_moxfield_list(deck_input.value);
});

let draw_button = document.querySelector("#draw_button");
draw_button.addEventListener("click", (e) => {
  let card = deck.cards.pop();
  hand.cards.push(card);
  card.fetch().then((_) => {
    hand.render();
  });
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
      console.log(player_id);
      break;
    case "players":
      players = msg.players;
      // Object.entries(msg.players).forEach(([id, player]) => {
      //   mice[id] = { mousePos: { x: 0, y: 0 }, color: player.color };
      // });
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
  drawBattlefield(ctx);
  drawTime(ctx);
  drawMice(ctx);
}

function drawBattlefield(ctx) {
  ctx.save();
  battlefield.forEach((card) => {
    card.render(ctx);
  });
  ctx.restore();
}

function drawMice(ctx) {
  Object.entries(players).forEach(([id, player]) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.mousePos.x, player.mousePos.y, 3, 0, 2 * Math.PI, false);
    ctx.fillStyle = player.color;
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
