const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let users = {};       // socket.id -> username
let chatHistory = []; // in-memory only

app.get("/", (req, res) => {
  res.send("🔥 ChatON backend is running");
});

io.on("connection", socket => {
  console.log("✅ Connected:", socket.id);

  // ===== JOIN =====
  socket.on("join", username => {
    if (!username || username.trim() === "") {
      socket.emit("join-error", "Invalid username");
      return;
    }

    if (Object.values(users).includes(username)) {
      socket.emit("join-error", "Username already in use");
      return;
    }

    users[socket.id] = username;
    socket.username = username;

    socket.emit("chat-history", chatHistory);
    io.emit("user-list", Object.values(users));

    const msg = `🟢 ${username} joined`;
    chatHistory.push({ type: "system", text: msg });
    io.emit("system-message", msg);
  });

  // ===== CHAT =====
  socket.on("chat-message", text => {
    if (!socket.username || !text) return;

    const msg = {
      type: "chat",
      user: socket.username,
      text
    };

    chatHistory.push(msg);
    if (chatHistory.length > 100) chatHistory.shift();

    io.emit("chat-message", msg);
  });

  // ===== WEBRTC SIGNALING =====
  socket.on("offer", data => {
    socket.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on("answer", data => {
    socket.to(data.to).emit("answer", {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on("ice", data => {
    socket.to(data.to).emit("ice", {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // ===== DISCONNECT =====
  socket.on("disconnect", () => {
    const username = users[socket.id];
    delete users[socket.id];

    if (username) {
      const msg = `🔴 ${username} left`;
      chatHistory.push({ type: "system", text: msg });
      io.emit("system-message", msg);
      io.emit("user-list", Object.values(users));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🔥 ChatON backend running on port", PORT);
});
