// calling/webrtc.js
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const createPeerConnection = ({ roomId, socket, onRemoteStream }) => {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  // ❌ Log connection state changes
  pc.onconnectionstatechange = () => {
    console.log("🔗 Connection State:", pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log("🧊 ICE Connection State:", pc.iceConnectionState);
  };

  // Send ICE candidates to the other peer
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("📤 Sending ICE candidate");
      socket.emit("ice-candidate", {
        roomId,
        candidate: event.candidate,
      });
    }
  };

  // Handle remote tracks (audio + video)
  pc.ontrack = (event) => {
    console.log("📥 Received remote track:", event.track.kind);
    const [stream] = event.streams;
    if (onRemoteStream) onRemoteStream(stream);
  };

  // Log negotiation needed
  pc.onnegotiationneeded = () => {
    console.log("📋 Negotiation needed");
  };

  return pc;
};
