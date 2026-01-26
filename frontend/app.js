// CONNECT SOCKET
const socket = io();

// ELEMENTS
const login = document.getElementById("login");
const chat = document.getElementById("chat");

const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("joinBtn");

const myCodeEl = document.getElementById("myCode");
const friendCodeInput = document.getElementById("friendCode");
const addFriendBtn = document.getElementById("addFriend");

const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const messages = document.getElementById("messages");

let myName = "";

// JOIN CHAT
joinBtn.onclick = () => {
  myName = usernameInput.value.trim();
  if (!myName) {
    alert("Enter your name");
    return;
  }

  socket.emit("join", myName);
  login.style.display = "none";
  chat.style.display = "block";
};

// RECEIVE MY FRIEND CODE
socket.on("my-code", code => {
  myCodeEl.textContent = code;
});

// ADD FRIEND
addFriendBtn.onclick = () => {
  const code = friendCodeInput.value.trim();
  if (!code) {
    alert("Enter friend code");
    return;
  }

  socket.emit("add-friend", code);
};

// FRIEND CONNECTED
socket.on("friend-connected", data => {
  const info = document.createElement("div");
  info.style.textAlign = "center";
  info.style.color = "#22c55e";
  info.textContent = `Connected with ${data.b}`;
  messages.appendChild(info);
});

// SEND PRIVATE MESSAGE
sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("private-message", text);
  msgInput.value = "";
};

// ENTER KEY SEND
msgInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendBtn.click();
});

// RECEIVE PRIVATE MESSAGE
socket.on("private-message", data => {
  const div = document.createElement("div");
  div.classList.add("message");

  if (data.user === myName) {
    div.classList.add("me");
    div.textContent = data.text;
  } else {
    div.textContent = `${data.user}: ${data.text}`;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// ERROR MESSAGE
socket.on("error-msg", msg => {
  alert(msg);
});
