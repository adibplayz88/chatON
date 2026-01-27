const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ================== DATA ==================
let users = {};          // socket.id -> username
let chatHistory = [];    // stored messages (RAM)

// ================== ROUTE ==================
app.get("/", (req, res) => {
  res.send("🔥 ChatON backend is running");
});

// ================== SOCKET ==================
io.on("connection", socket => {
  console.log("✅ Connected:", socket.id);

  // -------- JOIN --------
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

    // Send chat history to new user
    socket.emit("chat-history", chatHistory);

    // Notify everyone
    const joinMsg = {
      type: "system",
      text: `🟢 ${username} joined the call`
    };

    chatHistory.push(joinMsg);
    io.emit("system-message", joinMsg.text);
    io.emit("user-list", Object.values(users));

    console.log(`👤 ${username} joined`);
  });

  // -------- CHAT --------
  socket.on("chat-message", text => {
    if (!socket.username) return;

    const msg = {
      type: "chat",
      user: socket.username,
      text,
      time: Date.now()
    };

    chatHistory.push(msg);

    // Limit history (avoid RAM abuse)
    if (chatHistory.length > 200) {
      chatHistory.shift();
    }

    io.emit("chat-message", msg);
  });

  // -------- SPEAKING INDICATOR --------
  socket.on("speaking", state => {
    if (!socket.username) return;

    io.emit("speaking", {
      user: socket.username,
      state // true / false
    });
  });

  // -------- WEBRTC SIGNALING --------
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

  // -------- DISCONNECT --------
  socket.on("disconnect", () => {
    const username = users[socket.id];
    delete users[socket.id];

    if (username) {
      const leaveMsg = {
        type: "system",
        text: `🔴 ${username} left the call`
      };

      chatHistory.push(leaveMsg);
      io.emit("system-message", leaveMsg.text);
      io.emit("user-list", Object.values(users));

      console.log(`❌ ${username} left`);
    }
  });
});

// ================== START ==================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔥 ChatON backend running on port ${PORT}`);
});
