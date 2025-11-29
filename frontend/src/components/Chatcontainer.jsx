import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import Rightcontainer from "./Rightcontainer";
import SafeImage from "./SafeImage";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import CallIcon from "@mui/icons-material/Call";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useNavigate } from "react-router-dom";

const Chatcontainer = () => {
  const {
    messages,
    setMessages,
    selectedUser,
    setSelectedUser,
    getMessages,
    sendMessage,
    typingFrom,
  } = useContext(ChatContext);

  const { authUser, onlineUsers, axios, socket } = useContext(AuthContext);

  const [input, setInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [deleteMessageFor, setDeleteMessageFor] = useState(null);

  const scrollEnd = useRef(null);
  const navigate = useNavigate();

  // ---------------- LOAD MESSAGES WHEN USER SELECTS ----------------
  useEffect(() => {
     if (!selectedUser?._id) return;
    if (selectedUser?._id) {
      getMessages(selectedUser._id);

      // Mark messages of selected user as seen
      socket?.emit("mark-seen", {
        userId: selectedUser._id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?._id]);

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- DELETE MESSAGE ----------------
  const deleteMessage = async (msgId) => {
    setDeleteMessageFor(null);
    try {
      await axios.delete(`/api/messages/message/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      toast.success("Message deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // ---------------- SEND TEXT MESSAGE ----------------
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    await sendMessage({ text: input.trim() });
    setInput("");
  };

  // ---------------- SEND IMAGE MESSAGE ----------------
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return toast.error("Select an image");
    if (!file.type.startsWith("image/")) return toast.error("Invalid image type");

    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };



  // ---------------- START CALL ----------------
  const startCall = (withVideo) => {
    if (!selectedUser) return toast.error("Select a user first");
    navigate(`/call/${selectedUser._id}`, {
      state: { mode: "outgoing", withVideo },
    });
  };

  // ---------------- IF NO USER SELECTED ----------------
  if (!selectedUser)
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
        <img src={assets.logo_icon} className="max-w-16" />
        <p className="text-lg text-white">Chat anytime, anywhere</p>
      </div>
    );

  return (
    <div className="h-full overflow-scroll relative backdrop-blur-lg flex flex-col">
      {/* -------------------------------- HEADER -------------------------------- */}
      <div className="flex items-center justify-between py-3 px-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <SafeImage
            src={selectedUser.profilePic}
            onClick={() => setShowProfile(true)}
            className="w-10 h-10 rounded-full object-cover border border-white/20 cursor-pointer"
          />

          <div className="flex flex-col relative">
            <p className="text-white text-lg flex items-center gap-2">
              {selectedUser.fullName}
              <span
                className={`w-2 h-2 rounded-full ${
                  onlineUsers.includes(selectedUser._id)
                    ? "bg-green-500"
                    : "bg-gray-500"
                }`}
              ></span>
            </p>

            {/* Online / Last Seen */}
            <p
              className={`text-xs text-gray-300 transition-opacity duration-200 ${
                typingFrom === selectedUser._id ? "opacity-0" : "opacity-100"
              }`}
            >
              {onlineUsers.includes(selectedUser._id)
                ? "Online"
                : `Last seen ${new Date(
                    selectedUser.lastSeen
                  ).toLocaleTimeString()}`}
            </p>

            {/* Typing... */}
            {typingFrom === selectedUser._id && (
              <p className="absolute left-0 top-7 text-xs text-purple-300 animate-pulse">
                typing...
              </p>
            )}
          </div>
        </div>

        {/* CALL BUTTONS */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => startCall(false)}
            className="p-2 rounded-full bg-white/10"
          >
            <CallIcon className="text-white" />
          </button>

          <button
            onClick={() => startCall(true)}
            className="p-2 rounded-full bg-white/10"
          >
            <VideocamIcon className="text-white" />
          </button>

          {/* BACK BUTTON (mobile) */}
          <img
            onClick={() => setSelectedUser(null)}
            src={assets.arrow_icon}
            className="w-5 md:hidden cursor-pointer"
          />
        </div>
      </div>

      {/* -------------------------------- MESSAGES -------------------------------- */}
      <div className="flex flex-col h-[calc(100%-140px)] overflow-y-scroll p-3 pb-6">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`relative flex items-end gap-2 mb-6 ${
              msg.senderId === authUser._id ? "justify-end" : ""
            }`}
            onContextMenu={(e) => {
              e.preventDefault();
              setDeleteMessageFor(msg._id);
            }}
            onTouchStart={(e) => {
              const timer = setTimeout(
                () => setDeleteMessageFor(msg._id),
                600
              );
              e.target.addEventListener(
                "touchend",
                () => clearTimeout(timer),
                { once: true }
              );
            }}
          >
            {/* DELETE POPUP */}
            {deleteMessageFor === msg._id && (
              <div
                className={`absolute ${
                  msg.senderId === authUser._id ? "right-0" : "left-0"
                } -top-8 bg-black/80 text-white border border-white/20 rounded-md px-3 py-1 text-sm z-50`}
              >
                <p
                  onClick={() => deleteMessage(msg._id)}
                  className="cursor-pointer hover:text-red-400"
                >
                  Delete
                </p>
                <p
                  onClick={() => setDeleteMessageFor(null)}
                  className="text-gray-400 cursor-pointer"
                >
                  Cancel
                </p>
              </div>
            )}

            {/* LEFT SIDE AVATAR + TIME */}
            {msg.senderId !== authUser._id && (
              <div className="text-center text-xs">
                <SafeImage
                  src={selectedUser.profilePic}
                  className="w-7 h-7 rounded-full"
                />
                <p className="text-gray-500">
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            )}

            {/* MESSAGE BUBBLE TEXT / IMAGE */}
            {msg.image ? (
              <img
                src={msg.image}
                className="max-w-[230px] rounded-lg object-cover"
              />
            ) : (
              <p
                className={`p-2 max-w-[200px] rounded-lg bg-violet-500/30 text-white break-all ${
                  msg.senderId === authUser._id
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
              >
                {msg.text}
              </p>
            )}

            {/* RIGHT SIDE AVATAR + TIME */}
            {msg.senderId === authUser._id && (
              <div className="text-center text-xs">
                <SafeImage
                  src={authUser.profilePic}
                  className="w-7 h-7 rounded-full"
                />
                <p className="text-gray-500">
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            )}
          </div>
        ))}

        <div ref={scrollEnd}></div>
      </div>

      {/* -------------------------------- INPUT BAR -------------------------------- */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3">
        <div className="flex-1 flex items-center bg-gray-100/10 px-3 rounded-full">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              socket?.emit("typing", { toUserId: selectedUser._id });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage(e);
            }}
            onBlur={() =>
              socket?.emit("stop-typing", { toUserId: selectedUser._id })
            }
            className="flex-1 p-3 text-sm text-white bg-transparent outline-none"
            placeholder="Send a message"
          />

          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleSendImage}
            hidden
          />

          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>

        <button
          onClick={handleSendMessage}
          className="p-2 rounded-full bg-violet-500 hover:bg-violet-600"
        >
          <img src={assets.send_button} className="w-6" />
        </button>
      </div>

      {/*  PROFILE SIDEPANEL */}
      {showProfile && (
        <>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setShowProfile(false)}
          ></div>

          <div className="absolute right-0 top-0 h-full w-[90%] sm:w-[360px] md:w-[420px] bg-black/50 border-l border-white/10 p-6 z-50 animate-slide-in overflow-y-scroll">
            <div className="flex justify-between items-center mb-8 p-4">
              <h3 className="text-white text-xl font-semibold">Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              >
                <img src={assets.arrow_icon} className="w-6 rotate-180" />
              </button>
            </div>

            <Rightcontainer selectedUser={selectedUser} />
          </div>
        </>
      )}
    </div>
  );
};

export default Chatcontainer;
