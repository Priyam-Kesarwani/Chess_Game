const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastMove = null;

function playMoveSound() {
  const audio = new Audio("/move.mp3");
  audio.play();
}

function playEndSound() {
  const audio = new Audio("/winningChimes.mp3");
  audio.play();
}

function checkGameEnd() {
  console.log("checkGameEnd triggered");
  console.log(chess.game_over());
  console.log(chess.in_checkmate());

  if (chess.game_over()) {
    let message = "Game Over: ";
    if (chess.in_checkmate()) {
      message += chess.turn() === "w" ? "Black wins!" : "White wins!";
    } else if (chess.in_draw()) {
      message += "Draw!";
    } else {
      message += "Game ended!";
    }
    setTimeout(() => {
      alert(message);
    }, 100);
    playEndSound();
  }
}

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  document
    .querySelectorAll(".last-move")
    .forEach((el) => el.classList.remove("last-move"));
  console.log("Rendering board:", board);
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );
      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (
        lastMove &&
        ((8 - rowindex === parseInt(lastMove.from[1]) &&
          String.fromCharCode(97 + squareindex) === lastMove.from[0]) ||
          (8 - rowindex === parseInt(lastMove.to[1]) &&
            String.fromCharCode(97 + squareindex) === lastMove.to[0]))
      ) {
        squareElement.classList.add("last-move");
      }

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });
        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        pieceElement.addEventListener("dragover", (e) => {
          e.preventDefault();
        });
        pieceElement.addEventListener("drop", (e) => {
          e.preventDefault();
          if (draggedPiece) {
            const targetSquare = {
              row: parseInt(pieceElement.parentElement.dataset.row),
              col: parseInt(pieceElement.parentElement.dataset.col),
            };
            handleMove(sourceSquare, targetSquare);
          }
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(e.target.dataset.row),
            col: parseInt(e.target.dataset.col),
          };

          handleMove(sourceSquare, targetSquare);
        }
      });
      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }

};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
  console.log("Player role assigned:", playerRole);
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
  console.log("Spectator role assigned");
});

socket.on("gameOver", (message) => {
  setTimeout(() => {
    alert(message);
  }, 100);
});

socket.on("boardState", ({ fen, lastMove: serverLastMove }) => {
  chess.load(fen);
  lastMove = serverLastMove;

  renderBoard();
  playMoveSound();
  checkGameEnd();
});

// socket.on("move", (move) => {
//   console.log("🔥 move event received:", move);
//   chess.move(move);
//   renderBoard();

//   console.log("Move received:", move);
// });

// socket.on("move", (move) => {
//   const result = chess.move(move);
//   if (!result) {
//     console.warn("⚠️ Invalid move received from server:", move);
//     return;
//   }
//   renderBoard();
//   playMoveSound();
//   checkGameEnd();
// });

document.getElementById("resetBtn").addEventListener("click", () => {
  socket.emit("resetGame");
});

document.getElementById("undoBtn").addEventListener("click", () => {
  socket.emit("undoMove");
});

