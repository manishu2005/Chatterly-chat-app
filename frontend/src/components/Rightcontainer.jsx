import React, { useContext, useEffect, useState } from "react";
import SafeImage from "./SafeImage";
import assets from "../assets/assets";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";

const Rightcontainer = ({ selectedUser }) => {
  const { messages } = useContext(ChatContext);
  const { onlineUsers, logout } = useContext(AuthContext);

  const [msgImages, setMsgImages] = useState([]);

  if (!selectedUser) return null;

  // Collect all images from chat messages
  useEffect(() => {
    const images = messages.filter((msg) => msg.image).map((msg) => msg.image);
    setMsgImages(images);
  }, [messages]);

  return (
    <div className="relative h-full w-full text-white px-6 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/20 backdrop-blur-2xl"></div>

      <div className="relative z-10 flex flex-col h-full gap-4">
        {/* PROFILE SECTION */}
        <div className="flex flex-col items-center text-center pt-2">
          <SafeImage
            src={selectedUser.profilePic || assets.avatar_icon}
            className="w-28 h-28 rounded-full object-cover border border-white/20 shadow-xl"
          />

          <h2 className="mt-3 text-xl font-bold flex items-center gap-2">
            {onlineUsers.includes(selectedUser._id) && (
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            )}
            {selectedUser.fullName}
          </h2>

          <p className="text-white/70 text-sm">
            {selectedUser.bio || "Hey there! I am using Chatterly ❤️"}
          </p>
        </div>

        <hr className="border-white/20" />

        {/* MEDIA SECTION */}
        <div className="flex-1 flex flex-col">
          <p className="text-lg font-semibold text-center mb-3">Media</p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto pr-2">
            {msgImages.length === 0 && (
              <p className="text-gray-400 col-span-4 text-center text-sm">
                No media yet
              </p>
            )}

            {msgImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:opacity-90 transition"
              >
                <img
                  src={url}
                  alt="media"
                  className="w-full h-[80px] sm:h-[90px] object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="pb-4">
          <button
            onClick={() => logout()}
            className="w-full bg-gradient-to-r from-purple-500 to-violet-600 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Rightcontainer;
