import "./style.css";

let colors = ["red", "green", "blue", "yellow", "orange", "purple"];

// game globals
let appState = "loading";
let player_id = "";
let gameState = {};
let players = {};
let deck = [];
let hand;
let battlefield = [];

let selected_div = document.querySelector("#selected");
let hand_div = document.querySelector("#hand");

const scale = 1.8;

class Card {
  static width = 63;
  static height = 88;

  constructor(name) {
    this.name = name;
    this.x = 0;
    this.y = 0;
  }
  async fetch() {
    console.log("calling fetch for " + this.name);
    return fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${this.name}`
    ).then((res) => {
      const data = res.json();
      this.api_data = data;
      return data;
    });
  }
  toString() {
    return this.name;
  }
  mouseIsOver(mousePos) {
    if (this.isTapped) {
      return (
        mousePos.x > this.x &&
        mousePos.x < this.x + Card.height * scale &&
        mousePos.y > this.y &&
        mousePos.y < this.y + Card.width * scale
      );
    } else {
      return (
        mousePos.x > this.x &&
        mousePos.x < this.x + Card.width * scale &&
        mousePos.y > this.y &&
        mousePos.y < this.y + Card.height * scale
      );
    }
  }

  render(ctx) {
    if (this.isTapped) {
      ctx.save();
      ctx.translate(this.x, this.y + Card.width * scale);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(
        this.img,
        0,
        0,
        488,
        680,
        0,
        0,
        Card.width * scale,
        Card.height * scale
      );
      ctx.rotate(Math.PI / 2);
      ctx.restore();
    } else {
      ctx.drawImage(
        this.img,
        0,
        0,
        488,
        680,
        this.x,
        this.y,
        Card.width * scale,
        Card.height * scale
      );
    }
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
      card_div.style.border = "1px solid black";
      let play_button = document.createElement("button");
      play_button.innerHTML = "↑";
      play_button.addEventListener("click", (_) => {
        card.x = Card.width;
        card.y = Card.height;
        console.log("moving " + card.name + " to the battlefield");
        pushToBattlefield(card);
        this.cards.splice(i, 1);
        this.render();
      });
      hand_div.append(card_div, play_button);

      card.api_data.then((data) => {
        card.img = new Image();
        card.img.src = data.image_uris.normal;
        card.img.width = 200;
        card_div.appendChild(card.img);
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
canvas.height = window.innerHeight;
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
  card.fetch().then((data) => {
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
      break;
    case "moveToBattlefield":
      battlefield.push(msg.card);
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
  ctx.translate(0, 0);
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

const cursor = {
  dragging: false,
  card: null,
};
canvas.addEventListener("mousemove", (e) => {
  mousePos.x = e.x;
  mousePos.y = e.y;
  if (cursor.dragging) {
    cursor.card.x = mousePos.x - (Card.width * scale) / 2;
    cursor.card.y = mousePos.y - (Card.height * scale) / 2;
  } else {
    selected_div.innerHTML = "";
    cursor.card = null;
    battlefield.forEach((card) => {
      if (card.mouseIsOver(mousePos)) {
        cursor.card = card;
        selected_div.append(card.img);
      }
    });
  }
});
window.addEventListener("mousedown", (e) => {
  // check for battlefield cards
  battlefield.forEach((card) => {
    if (card.mouseIsOver(mousePos)) {
      cursor.dragging = true;
      cursor.card = card;
      selected_div.innerHTML = "";
      selected_div.append(card.img);
    }
  });
});
window.addEventListener("mouseup", (e) => {
  cursor.dragging = false;
  cursor.card = null;
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

window.addEventListener("keypress", (e) => {
  if (cursor.card) {
    if (e.key === "t") {
      cursor.card.isTapped = !cursor.card.isTapped;
    }
  }
});

function pushToBattlefield(card) {
  console.log("moving " + card.name + " to the battlefield");
  battlefield.push(card);
  ws.send(
    JSON.stringify({
      action: "moveToBattlefield",
      card,
    })
  );
}
