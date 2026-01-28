const socket = io("https://chaton-backend-p22z.onrender.com");

let joined = false;
let localStream;
const peers = {};

function join() {
  const name = document.getElementById("username").value.trim();
  if (!name) return;
  socket.emit("join", name);
}

socket.on("join-error", msg => {
  document.getElementById("error").innerText = msg;
});

socket.on("chat-history", history => {
  history.forEach(m => {
    if (m.type === "system") addSystem(m.text);
    else addChat(m.user, m.text);
  });

  joined = true;
  document.getElementById("joinBox").hidden = true;
  document.getElementById("chatBox").hidden = false;
});

socket.on("user-list", list => {
  document.getElementById("users").innerText =
    "👥 Users: " + list.join(", ");
});

socket.on("system-message", text => addSystem(text));
socket.on("chat-message", msg => addChat(msg.user, msg.text));

function send() {
  if (!joined) return;
  const input = document.getElementById("msg");
  const text = input.value.trim();
  if (!text) return;
  socket.emit("chat-message", text);
  input.value = "";
}

function addChat(user, text) {
  const div = document.createElement("div");
  div.innerHTML = `<b>${user}:</b> ${text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addSystem(text) {
  const div = document.createElement("div");
  div.className = "system";
  div.innerText = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ===== VOICE (BASIC, STABLE) =====
async function startVoice() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
}

socket.on("offer", async data => {
  const pc = new RTCPeerConnection();
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.onicecandidate = e => {
    if (e.candidate)
      socket.emit("ice", { to: data.from, candidate: e.candidate });
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
  peers[data.from]?.setRemoteDescription(data.answer);
});

socket.on("ice", data => {
  peers[data.from]?.addIceCandidate(data.candidate);
});
