const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("🔥 ChatON backend is running");
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  let user = "";

  // ---------- CHAT ----------
  socket.on("join", (username) => {
    user = username;
    console.log("👤", username, "joined");
  });

  socket.on("message", (text) => {
    io.emit("message", { user, text });
  });

  // ---------- GROUP VOICE CALL ----------
  socket.on("join-call", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    socket.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    socket.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ✅ ONLY ONE LISTEN — THIS IS THE LAW
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🔥 ChatON backend running on port " + PORT);
});
