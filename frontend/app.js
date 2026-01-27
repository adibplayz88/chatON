const socket = io("https://YOUR-BACKEND-URL");

let localStream;
let peers = {};

const joinBtn = document.getElementById("join");
const leaveBtn = document.getElementById("leave");
const sendBtn = document.getElementById("send");

joinBtn.onclick = async () => {
  const username = document.getElementById("username").value;
  if (!username) return alert("Enter username");

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  socket.emit("join", username);
};

leaveBtn.onclick = () => {
  socket.disconnect();
  location.reload(); // clean reset
};

socket.on("join-error", msg => {
  alert(msg);
});

// ===== USER LIST =====
socket.on("user-list", users => {
  const ul = document.getElementById("users");
  ul.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.innerText = u + " 🎧";
    ul.appendChild(li);
  });
});

// ===== CHAT =====
sendBtn.onclick = () => {
  const input = document.getElementById("msg");
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chat-message", msg);
  input.value = "";
};

socket.on("chat-message", data => {
  addMessage(`<b>${data.user}:</b> ${data.text}`);
});

socket.on("system-message", msg => {
  addMessage(`<i style="color:#94a3b8">${msg}</i>`);
});

function addMessage(html) {
  const chat = document.getElementById("chat");
  chat.innerHTML += `<div class="msg">${html}</div>`;
  chat.scrollTop = chat.scrollHeight;
}

// ===== WEBRTC =====
socket.on("user-joined", id => {
  const pc = createPeer(id, true);
  peers[id] = pc;
});

socket.on("offer", async ({ from, offer }) => {
  const pc = createPeer(from, false);
  peers[from] = pc;

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", { to: from, answer });
});

socket.on("answer", async ({ from, answer }) => {
  await peers[from].setRemoteDescription(answer);
});

socket.on("ice", ({ from, candidate }) => {
  peers[from]?.addIceCandidate(candidate);
});

function createPeer(id, isCaller) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.onicecandidate = e => {
    if (e.candidate)
      socket.emit("ice", { to: id, candidate: e.candidate });
  };

  pc.ontrack = e => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  if (isCaller) {
    pc.createOffer().then(o => {
      pc.setLocalDescription(o);
      socket.emit("offer", { to: id, offer: o });
    });
  }

  return pc;
}
