const socket = io("https://chaton-backend-p22z.onrender.com");

let joined = false;
let username = "";
let localStream;
let muted = false;

const peers = {};

// ===== JOIN =====
function join() {
  username = document.getElementById("username").value.trim();
  if (!username) return;

  socket.emit("join", username);
}

socket.on("join-error", msg => {
  document.getElementById("error").innerText = msg;
});

socket.on("user-list", list => {
  document.getElementById("users").innerHTML =
    "👥 Users: " + list.join(", ");
});

socket.on("system-message", text => {
  addMessage("system", text);
});

socket.on("chat-history", history => {
  history.forEach(m => {
    if (m.type === "system") addMessage("system", m.text);
    if (m.type === "chat") addMessage(m.user, m.text);
  });
  joined = true;
  document.getElementById("joinBox").hidden = true;
  document.getElementById("chatBox").hidden = false;
});

// ===== CHAT =====
function sendMessage() {
  if (!joined) return;

  const input = document.getElementById("msg");
  const text = input.value.trim();
  if (!text) return;

  socket.emit("chat-message", text);
  input.value = "";
}

socket.on("chat-message", msg => {
  addMessage(msg.user, msg.text);
});

// ===== UI MESSAGE =====
function addMessage(user, text) {
  const box = document.getElementById("messages");
  const div = document.createElement("div");

  if (user === "system") {
    div.className = "system";
    div.innerText = text;
  } else {
    div.innerHTML = `<b>${user}:</b> ${text}`;
  }

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ===== VOICE =====
async function startVoice() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  socket.emit("speaking", true);

  socket.on("user-joined", id => {
    createPeer(id);
  });
}

function createPeer(id) {
  const pc = new RTCPeerConnection();

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", { to: id, candidate: e.candidate });
    }
  };

  pc.ontrack = e => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer);
    socket.emit("offer", { to: id, offer });
  });

  peers[id] = pc;
}

socket.on("offer", async data => {
  const pc = new RTCPeerConnection();

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", { to: data.from, candidate: e.candidate });
    }
  };

  pc.ontrack = e => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  await pc.setRemoteDescription(data.offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", { to: data.from, answer });
  peers[data.from] = pc;
});

socket.on("answer", data => {
  peers[data.from].setRemoteDescription(data.answer);
});

socket.on("ice", data => {
  peers[data.from].addIceCandidate(data.candidate);
});

// ===== MUTE =====
function toggleMute() {
  if (!localStream) return;

  muted = !muted;
  localStream.getAudioTracks()[0].enabled = !muted;
}
