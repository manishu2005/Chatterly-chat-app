// calling/signaling.js
export const registerCallEvents = ({
  socket,
  pcRef,
  remoteVideoRef,
  setCallState,
}) => {
  if (!socket) return;

  // 📞 Incoming call
  socket.on("incoming-call", ({ roomId, fromUserId, offer, withVideo }) => {
    setCallState({
      type: "incoming",
      roomId,
      fromUserId,
      offer,
      withVideo,
    });
  });

  // 📞 Caller receives answer
  socket.on("call-accepted", async ({ answer }) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(answer);
    }
  });

  // 🧊 ICE candidate received
  socket.on("ice-candidate", async ({ candidate }) => {
    if (pcRef.current && candidate) {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("ICE add error:", err);
      }
    }
  });

  // ❌ Call Ended
  socket.on("call-ended", () => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState(null);
  });

  // ⏳ Timeout (Rings 30 sec)
  socket.on("call-timeout", () => {
    setCallState(null);
  });

  // 🚫 Busy
  socket.on("user-busy", () => {
    setCallState(null);
  });
};
