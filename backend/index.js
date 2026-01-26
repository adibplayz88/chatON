const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ✅ Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🔥 ChatON backend is running");
});

// ================= SOCKET LOGIC =================

io.on("connection", socket => {
  console.log("✅ User connected:", socket.id);

  // user joins
  socket.on("join", username => {
    socket.username = username;
    console.log(`👤 ${username} joined`);

    // notify others
    socket.broadcast.emit("user-joined", socket.id);
  });

  // WebRTC offer
  socket.on("offer", data => {
    io.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer
    });
  });

  // WebRTC answer
  socket.on("answer", data => {
    io.to(data.to).emit("answer", {
      from: socket.id,
      answer: data.answer
    });
  });

  // ICE candidate
  socket.on("ice", data => {
    io.to(data.to).emit("ice", {
      from: socket.id,
      candidate: data.candidate
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ================= SERVER START =================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🔥 ChatON backend running on port ${PORT}`);
});
