const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let users = {}; // socket.id -> username

app.get("/", (req, res) => {
  res.send("🔥 ChatON backend is running");
});

io.on("connection", socket => {
  console.log("✅ Connected:", socket.id);

  // ===== JOIN =====
  socket.on("join", username => {
    if (Object.values(users).includes(username)) {
      socket.emit("join-error", "Username already in use");
      return;
    }

    users[socket.id] = username;
    socket.username = username;

    io.emit("system-message", `🟢 ${username} joined the call`);
    io.emit("user-list", Object.values(users));

    socket.broadcast.emit("user-joined", socket.id);
  });

  // ===== CHAT =====
  socket.on("chat-message", text => {
    io.emit("chat-message", {
      user: socket.username,
      text
    });
  });

  // ===== WEBRTC =====
  socket.on("offer", data => {
    io.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on("answer", data => {
    io.to(data.to).emit("answer", {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on("ice", data => {
    io.to(data.to).emit("ice", {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // ===== LEAVE / DISCONNECT =====
  socket.on("disconnect", () => {
    const name = users[socket.id];
    delete users[socket.id];

    if (name) {
      io.emit("system-message", `🔴 ${name} left the call`);
      io.emit("user-list", Object.values(users));
    }

    console.log("❌ Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔥 ChatON backend running on port ${PORT}`);
});
