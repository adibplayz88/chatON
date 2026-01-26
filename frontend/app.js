const socket = io("https://chaton-backend-p22z.onrender.com"); 
// 👆 replace with YOUR render URL if different

let localStream;
let peers = {};
const room = "chaton-voice-room";

async function joinVoice() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  socket.emit("join-voice", room);

  socket.on("voice-user-joined", async (id) => {
    const pc = createPeer(id);
    peers[id] = pc;

    localStream.getTracks().forEach(track =>
      pc.addTrack(track, localStream)
    );

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("voice-offer", { offer, to: id });
  });

  socket.on("voice-offer", async ({ offer, from }) => {
    const pc = createPeer(from);
    peers[from] = pc;

    localStream.getTracks().forEach(track =>
      pc.addTrack(track, localStream)
    );

    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("voice-answer", { answer, to: from });
  });

  socket.on("voice-answer", async ({ answer, from }) => {
    await peers[from].setRemoteDescription(answer);
  });

  socket.on("voice-ice", ({ candidate, from }) => {
    peers[from].addIceCandidate(candidate);
  });
}

function createPeer(id) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("voice-ice", {
        candidate: e.candidate,
        to: id
      });
    }
  };

  pc.ontrack = (e) => {
    document.getElementById("remoteAudio").srcObject = e.streams[0];
  };

  return pc;
}
