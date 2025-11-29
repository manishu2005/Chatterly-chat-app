// src/components/CallListener.jsx
import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import toast from "react-hot-toast";

const CallListener = () => {
  const { socket } = useContext(AuthContext);
  const { users } = useContext(ChatContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    // 📞 Someone is calling you
    const handleIncoming = ({ roomId, fromUserId, offer, withVideo }) => {
      const caller = users.find((u) => u._id === fromUserId);

      toast(
        `Incoming ${withVideo ? "video" : "voice"} call from ${
          caller?.fullName || "Unknown User"
        }`,
        { icon: "📞" }
      );

      navigate(`/call/${roomId}`, {
        state: {
          mode: "incoming",
          roomId,
          fromUserId,
          offer,
          withVideo,
        },
      });
    };

    // 🚫 Call rejected because user is busy
    const handleBusy = () => {
      toast.error("User is busy on another call");
    };

    socket.on("incoming-call", handleIncoming);
    socket.on("user-busy", handleBusy);

    return () => {
      socket.off("incoming-call", handleIncoming);
      socket.off("user-busy", handleBusy);
    };
  }, [socket, users, navigate]);

  return null;
};

export default CallListener;
