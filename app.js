const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const { title } = require("process");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

const PORT = process.env.PORT || 5000; 

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniqueSocket) => {
  console.log("A user connected:", uniqueSocket.id);
  if (!players.white) {
    players.white = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "b");
  } else {
    uniqueSocket.emit("spectatorRole");
  }

  uniqueSocket.on("disconnect", () => {
    console.log("A user disconnected:", uniqueSocket.id);
    if (players.white === uniqueSocket.id) {
      delete players.white;
    } else if (players.black === uniqueSocket.id) {
      delete players.black;
    }
    if (!players.white && !players.black) {
      chess.reset();
      currentPlayer = "w";
    }
  });

  uniqueSocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniqueSocket.id !== players.white) return;
      if (chess.turn() === "b" && uniqueSocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        // io.emit("move", move);
        const history = chess.history({ verbose: true });
        const lastMove =
          history.length > 0 ? history[history.length - 1] : null;
        io.emit("boardState", { fen: chess.fen(), lastMove }); 

        // ✅ Check for game end here
        if (chess.game_over()) {
          let message = "Game Over: ";
          if (chess.in_checkmate()) {
            message += chess.turn() === "w" ? "Black wins!" : "White wins!";
          } else if (chess.in_draw()) {
            message += "Draw!";
          } else {
            message += "Game ended!";
          }
          io.emit("gameOver", message); // ✅ Send to all players + spectators
        }
      } else {
        console.log("Invalid move attempted:", move);
        uniqueSocket.emit("invalidMove", move);
      }
    } catch (error) {
      console.error("Invalid move:", error);
      uniqueSocket.emit("invalidMove", move);
    }
  });

  uniqueSocket.on("resetGame", () => {
    chess.reset();
    io.emit("boardState", { fen: chess.fen(), lastMove: null });
  });

  uniqueSocket.on("undoMove", () => {
    chess.undo();
    const history = chess.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : null;
    io.emit("boardState", { fen: chess.fen(), lastMove });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
