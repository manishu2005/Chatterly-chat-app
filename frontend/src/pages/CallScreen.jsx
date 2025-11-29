// src/components/CallScreen.jsx
import React, { useEffect, useRef, useState, useContext } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { createPeerConnection } from "../calling/webrtc";
import MicOffIcon from "@mui/icons-material/MicOff";
import MicNoneIcon from "@mui/icons-material/MicNone";
import CallEndIcon from "@mui/icons-material/CallEnd";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import toast from "react-hot-toast";

const CallScreen = () => {
  // Outgoing: URL me callee userId aata hai
  // Incoming: URL me roomId aata hai (state se bhi milta hai)
  const { roomId: paramRoomOrUserId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const { authUser, socket } = useContext(AuthContext);
  const { users } = useContext(ChatContext);

  const mode = state?.mode || "outgoing"; // 'outgoing' | 'incoming'
  const withVideo = state?.withVideo ?? true;
  const incomingOffer = state?.offer || null;
  const incomingFromUserId = state?.fromUserId || null;

  const isIncoming = mode === "incoming";

  // jis user se baat ho rahi hai
  const otherUserId = isIncoming ? incomingFromUserId : paramRoomOrUserId;
  const otherUser = users.find((u) => u._id === otherUserId);

  // roomId server wale pattern se match hona chahiye
  const roomId = isIncoming ? state.roomId : `${authUser._id}-${otherUserId}`;

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const iceCandidateQueueRef = useRef([]); // Queue for ICE candidates received before remote description

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [callStatus, setCallStatus] = useState(
    isIncoming ? "Incoming call..." : "Calling…"
  );
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(withVideo);
  const [hasAnswered, setHasAnswered] = useState(isIncoming ? false : true);

  // ------- Cleanup / navigation helper -------
  const cleanupAndExit = (force = false) => {
    try {
      // Stop all tracks
      localStreamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
      remoteStreamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });

      // Clear references
      localStreamRef.current = null;
      remoteStreamRef.current = null;

      // Clear video/audio elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }

      // Close peer connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    if (force) {
      navigate("/", { replace: true });
    } else {
      navigate("/");
    }
  };

  // ---------------- Setup PeerConnection + socket listeners ----------------
  useEffect(() => {
    if (!socket || !otherUserId) return;

    console.log("📱 Initializing call:", { isIncoming, otherUserId, roomId });

    const onRemoteStream = (stream) => {
      console.log("🎬 Remote stream received with tracks:", stream.getTracks().map(t => t.kind));
      remoteStreamRef.current = stream;

      if (!withVideo && remoteAudioRef.current) {
        console.log("🔊 Setting audio element");
        remoteAudioRef.current.srcObject = stream;
      }

      if (withVideo && remoteVideoRef.current) {
        console.log("📹 Setting remote video element");
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pcRef.current = createPeerConnection({
      roomId,
      socket,
      onRemoteStream,
    });

    const pc = pcRef.current;

    // Outgoing side: start call immediately
    if (!isIncoming) {
      console.log("☎️ Starting outgoing call");
      startOutgoingCall(pc);
    }

    // Answer from callee to caller
    const handleCallAccepted = async ({ answer, roomId: answerRoom }) => {
      console.log("✅ Received call-accepted", { answerRoom, currentRoom: roomId });
      if (answerRoom !== roomId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("🤝 Remote description set successfully");
        
        // Process any queued ICE candidates
        console.log(`🧊 Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
        while (iceCandidateQueueRef.current.length > 0) {
          const queuedCandidate = iceCandidateQueueRef.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(queuedCandidate));
            console.log("✅ Queued ICE candidate added");
          } catch (err) {
            console.error("❌ Error adding queued ICE candidate:", err);
          }
        }
        
        setCallStatus("Connected");
      } catch (err) {
        console.error("❌ setRemoteDescription error", err);
        toast.error("Connection failed");
      }
    };

    // ICE candidate
    const handleIce = async ({ candidate }) => {
      if (pc && candidate) {
        try {
          // If remote description not set yet, queue the candidate
          if (!pc.remoteDescription) {
            console.log("🧊 Remote description not ready, queueing ICE candidate");
            iceCandidateQueueRef.current.push(candidate);
            return;
          }
          
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ ICE candidate added");
        } catch (err) {
          console.error("❌ ICE error", err);
        }
      }
    };

    // Call ended by remote or server
    const handleCallEnded = () => {
      console.log("📵 Call ended by peer");
      toast("Call ended");
      cleanupAndExit(true);
    };

    // Timeout (no answer in 30s)
    const handleTimeout = () => {
      console.log("⏰ Call timeout");
      toast.error("Call not answered");
      cleanupAndExit(true);
    };

    // Callee busy
    const handleUserBusy = ({ toUserId }) => {
      console.log("🚫 User busy", { toUserId, otherUserId });
      if (toUserId === otherUserId) {
        toast.error("User is busy on another call");
        cleanupAndExit(true);
      }
    };

    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIce);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-timeout", handleTimeout);
    socket.on("user-busy", handleUserBusy);

    return () => {
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIce);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-timeout", handleTimeout);
      socket.off("user-busy", handleUserBusy);

      pcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, otherUserId, roomId, isIncoming, withVideo]);

  // ---------------- Outgoing side: start call ----------------
  const startOutgoingCall = async (pc) => {
    try {
      console.log("📞 Getting user media for outgoing call...");
      const constraints = withVideo
        ? { audio: true, video: { width: 1280, height: 720 } }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream obtained:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

      localStreamRef.current = stream;

      // ✅ Add all tracks to peer connection BEFORE creating offer
      stream.getTracks().forEach((track) => {
        console.log(`📤 Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });

      // Show local preview
      if (withVideo && localVideoRef.current) {
        console.log("📹 Setting local video preview");
        localVideoRef.current.srcObject = stream;
      }

      // Create offer and send to caller
      console.log("📋 Creating offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("✅ Offer created and set as local description");

      socket.emit("call-user", {
        fromUserId: authUser._id,
        toUserId: otherUserId,
        offer,
        withVideo,
      });
      console.log("📤 Offer sent to server");
    } catch (err) {
      console.error("❌ Outgoing call error:", err);
      toast.error("Cannot start call. Check camera/mic permissions.");
      cleanupAndExit(true);
    }
  };

  // ---------------- Incoming side: accept call ----------------
  const acceptCall = async () => {
    if (!incomingOffer) return;

    try {
      console.log("📞 Accepting incoming call...");
      const pc = pcRef.current;
      const constraints = withVideo
        ? { audio: true, video: { width: 1280, height: 720 } }
        : { audio: true };

      console.log("🎤 Getting local media...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Local media obtained:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

      localStreamRef.current = stream;

      // ✅ Add tracks BEFORE setting remote description
      stream.getTracks().forEach((track) => {
        console.log(`📤 Adding ${track.kind} track for answer side`);
        pc.addTrack(track, stream);
      });

      // Show local preview
      if (withVideo && localVideoRef.current) {
        console.log("📹 Setting local video preview");
        localVideoRef.current.srcObject = stream;
      }

      // ✅ Now set remote description (the offer from caller)
      console.log("🎯 Setting remote description (incoming offer)");
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      console.log("✅ Remote description set");

      // Process any queued ICE candidates
      console.log(`🧊 Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
      while (iceCandidateQueueRef.current.length > 0) {
        const queuedCandidate = iceCandidateQueueRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(queuedCandidate));
          console.log("✅ Queued ICE candidate added");
        } catch (err) {
          console.error("❌ Error adding queued ICE candidate:", err);
        }
      }

      // Create answer
      console.log("📋 Creating answer...");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("✅ Answer created and set as local description");

      socket.emit("accept-call", {
        roomId,
        answer,
        toUserId: otherUserId, // caller
      });
      console.log("📤 Answer sent to caller");

      setHasAnswered(true);
      setCallStatus("Connected");
    } catch (err) {
      console.error("❌ Accept call error:", err);
      toast.error("Cannot accept call. Check permissions.");
      cleanupAndExit(true);
    }
  };

  const declineCall = () => {
    socket.emit("end-call", { roomId });
    cleanupAndExit(true);
  };

  const endCall = () => {
    socket.emit("end-call", { roomId });
    cleanupAndExit(true);
  };

  // ---------------- Controls ----------------
  const toggleMute = () => {
    const audioTrack = localStreamRef.current
      ?.getTracks()
      .find((t) => t.kind === "audio");
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current
      ?.getTracks()
      .find((t) => t.kind === "video");
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  const isVideoCall = withVideo;

  // ---------------- UI ----------------
  return (
    <div className="w-full h-screen bg-black text-white flex flex-col relative">
      {/* Remote Video or Avatar */}
      <div className="flex-1 relative flex items-center justify-center">
        {isVideoCall ? (
          <>
            {/* Remote video full screen */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover bg-black"
            />

            {/* Local preview bottom-right */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-28 h-40 rounded-lg border border-white/20 z-30 absolute bottom-32 right-4 object-cover bg-black/60"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <img
              src={otherUser?.profilePic}
              className="w-32 h-32 rounded-full object-cover mb-4 border border-white/20"
              alt=""
            />
            <p className="text-2xl font-semibold">{otherUser?.fullName}</p>
            <p className="text-gray-400 mt-2">{callStatus}</p>
          </div>
        )}
      </div>

      {/* Incoming call overlay (for receiver before accepting) */}
      {isIncoming && !hasAnswered && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/60 z-40">
          <p className="mb-4 text-lg">
            {otherUser?.fullName} is calling you…
          </p>
          <div className="flex gap-6">
            <button
              onClick={declineCall}
              className="bg-red-600 p-4 rounded-full shadow-lg"
            >
              <CallEndIcon style={{ fontSize: 28 }} />
            </button>
            <button
              onClick={acceptCall}
              className="bg-green-600 p-4 rounded-full shadow-lg"
            >
              {isVideoCall ? "Video" : "Voice"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="w-full flex justify-center items-center gap-6 pb-10 mt-auto z-30">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className="bg-gray-800 p-4 rounded-full flex items-center justify-center"
        >
          {isMuted ? (
            <MicOffIcon style={{ fontSize: 28 }} />
          ) : (
            <MicNoneIcon style={{ fontSize: 28 }} />
          )}
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="bg-red-600 p-4 rounded-full shadow-lg flex items-center justify-center"
        >
          <CallEndIcon style={{ fontSize: 28 }} />
        </button>

        {/* Camera toggle */}
        {isVideoCall && (
          <button
            onClick={toggleCamera}
            className="bg-gray-800 p-4 rounded-full flex items-center justify-center"
          >
            <CameraAltIcon style={{ fontSize: 28 }} />
          </button>
        )}

        {/* Voice call me remote audio element */}
        {!isVideoCall && (
          <audio ref={remoteAudioRef} autoPlay playsInline />
        )}
      </div>
    </div>
  );
};

export default CallScreen;
