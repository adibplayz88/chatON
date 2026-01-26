const socket = io("https://YOUR-BACKEND-URL"); 
// example: https://chaton-backend.onrender.com

let localStream;
let peers = {};

const joinBtn = document.getElementById("join");
const usernameInput = document.getElementById("username");

joinBtn.onclick = async () => {
  if (!usernameInput.value) {
    alert("Enter name");
    return;
  }

  // 🔑 MOBILE SAFE mic request
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  socket.emit("join", usernameInput.value);
};

socket.on("user-joined", async id => {
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
    audio.playsInline = true;
    document.body.appendChild(audio);
  };

  if (isCaller) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit("offer", { to: id, offer });
    });
  }

  return pc;
}
