const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("frontend"));

app.get("/", (req, res) => {
  res.send("🔥 ChatON backend running");
});

app.use(express.static("frontend"));

const users = {};

function makeCode(name) {
  return name + "#" + Math.floor(1000 + Math.random() * 9000);
}

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  socket.on("join", name => {
    const code = makeCode(name);
    users[socket.id] = { name, code, room: null };
    socket.emit("my-code", code);
  });

  socket.on("add-friend", friendCode => {
    const me = users[socket.id];
    if (!me) return;

    const friendId = Object.keys(users).find(
      id => users[id].code === friendCode
    );

    if (!friendId) {
      socket.emit("error-msg", "Friend not found");
      return;
    }

    const room = `room-${socket.id}-${friendId}`;

    users[socket.id].room = room;
    users[friendId].room = room;

    socket.join(room);
    io.to(friendId).socketsJoin(room);

    io.to(room).emit("friend-connected", {
      a: me.name,
      b: users[friendId].name
    });
  });

  socket.on("private-message", text => {
    const user = users[socket.id];
    if (!user || !user.room) return;

    io.to(user.room).emit("private-message", {
      user: user.name,
      text
    });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
  });
});

server.listen(3000, () => {
  console.log("ChatON running on 3000");
});
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🔥 ChatON backend running on port " + PORT);
});
