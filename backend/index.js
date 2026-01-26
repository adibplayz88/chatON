const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

/* -------- BASIC ROUTE -------- */
app.get("/", (req, res) => {
  res.send("🔥 ChatON backend is running");
});

/* -------- SOCKET -------- */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* ===== VOICE CALL ===== */
  socket.on("join-voice", (room) => {
    socket.join(room);
    socket.to(room).emit("voice-user-joined", socket.id);
  });

  socket.on("voice-offer", ({ offer, to }) => {
    socket.to(to).emit("voice-offer", {
      offer,
      from: socket.id
    });
  });

  socket.on("voice-answer", ({ answer, to }) => {
    socket.to(to).emit("voice-answer", {
      answer,
      from: socket.id
    });
  });

  socket.on("voice-ice", ({ candidate, to }) => {
    socket.to(to).emit("voice-ice", {
      candidate,
      from: socket.id
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ❗ ONLY ONE LISTEN ❗ */
server.listen(PORT, () => {
  console.log("🔥 ChatON backend running on port", PORT);
});
