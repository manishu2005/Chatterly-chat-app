import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import SafeImage from "./SafeImage";
import toast from "react-hot-toast";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    typingUsers,
    setMessages,
  } = useContext(ChatContext);

  const { authUser, logout, onlineUsers, axios, socket } =
    useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showDeleteFor, setShowDeleteFor] = useState(null);

  const navigate = useNavigate();

  // ---------------- LOAD USERS ----------------
  useEffect(() => {
    getUsers();
    // eslint-disable-next-line
  }, []);

  // Auto-close menu after 30 seconds
  useEffect(() => {
    let timer;
    if (menuOpen) {
      timer = setTimeout(() => setMenuOpen(false), 30000);
    }
    return () => clearTimeout(timer);
  }, [menuOpen]);

  // Close delete menu on outside click
  useEffect(() => {
    const hidePopup = () => setShowDeleteFor(null);
    window.addEventListener("click", hidePopup);
    return () => window.removeEventListener("click", hidePopup);
  }, []);

  // ---------------- SEARCH USERS ----------------
  const filteredUsers = input
    ? users.filter((u) =>
        u.fullName.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  // ---------------- DELETE USER COMPLETELY ----------------
  const handleDeleteUser = async (userId, fullName) => {
    if (!window.confirm(`Delete user ${fullName}? This cannot be undone.`))
      return;

    try {
      await axios.delete(`/api/user/${userId}`);

      if (selectedUser?._id === userId) {
        setSelectedUser(null);
        setMessages([]);
      }

      await getUsers();
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  // ---------------- DELETE ONLY CHAT ----------------
  const handleDeleteUserChat = async (userId, fullName) => {
    if (!window.confirm(`Delete chat with ${fullName}?`)) return;

    try {
      await axios.delete(`/api/messages/conversation/${userId}`);

      if (selectedUser?._id === userId) {
        setSelectedUser(null);
        setMessages([]);
      }

      await getUsers();
      toast.success("Chat removed");
    } catch (err) {
      toast.error("Failed to delete chat");
    }
  };

  // ---------------- SEND FRIEND REQUEST ----------------
  const sendFriendRequest = async (userId, username) => {
    try {
      const { data } = await axios.post("/api/friends/send", {
        toUsername: username,
      });

      if (!data.success) return toast.error(data.message);

      socket?.emit("send-request", { toUserId: userId, fromUser: authUser });

      toast.success("Friend request sent");
      getUsers();
    } catch (err) {
      toast.error("Failed to send request");
    }
  };

  // ---------------- ACCEPT FRIEND REQUEST ----------------
  const acceptRequest = async (userId) => {
    try {
      const { data } = await axios.post(`/api/friends/accept/${userId}`);

      if (!data.success) return toast.error(data.message);

      socket?.emit("accept-request", { toUserId: userId });

      toast.success("Friend added");
      getUsers();
    } catch (err) {
      toast.error("Failed to accept request");
    }
  };

  return (
    <div
      className={`h-full bg-white/8 backdrop-blur-xl border-r border-white/10 p-4 overflow-y-auto text-white transition-all duration-300 ${
        selectedUser ? "max-md:hidden" : "w-full md:w-72"
      }`}
      onClick={() => setShowDeleteFor(null)}
    >
      {/* ---------- TOP SECTION ---------- */}
      <div className="pb-5">
        <div className="flex justify-between items-center mb-4">
          <img src={assets.logo} className="h-10 opacity-90" alt="logo" />

          <div className="relative">
            <img
              src={assets.menu_icon}
              className="w-6 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
            />

            {/* ---------------- MENU DROPDOWN ---------------- */}
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 p-3 bg-[#282142] border border-white/20 rounded-md shadow-xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="text-sm cursor-pointer hover:text-violet-400"
                >
                  Edit Profile
                </p>

                {/* Added Me Option */}
                <p
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/added-me");
                  }}
                  className="text-sm cursor-pointer hover:text-violet-400 mt-2"
                >
                  Added Me
                </p>

                <hr className="border-white/20 my-2" />

                <p
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="text-sm cursor-pointer hover:text-red-400"
                >
                  Logout
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/10 rounded-full flex items-center gap-2 p-2 px-4">
          <img src={assets.search_icon} className="w-4 opacity-80" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search user..."
            className="bg-transparent w-full text-sm outline-none placeholder-gray-300"
          />
        </div>
      </div>

      {/* ---------- USER LIST ---------- */}
      <div className="flex flex-col gap-1">
        {filteredUsers.map((user) => {
          let pressTimer = null;

          const startPress = (e) => {
            e.stopPropagation();
            pressTimer = setTimeout(() => {
              setShowDeleteFor(user._id);
            }, 650);
          };

          const stopPress = () => clearTimeout(pressTimer);

          const isFriend = user.friends?.includes(authUser._id);
          const hasSentMeRequest = user.sentRequests?.includes(authUser._id);
          const iSentRequest = user.receivedRequests?.includes(authUser._id);

          return (
            <div
              key={user._id}
              className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/10 duration-200 ${
                selectedUser?._id === user._id ? "bg-white/14" : ""
              }`}
              onMouseDown={startPress}
              onMouseUp={stopPress}
              onMouseLeave={stopPress}
              onTouchStart={startPress}
              onTouchEnd={stopPress}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setShowDeleteFor(user._id);
              }}
            >
              {/* Avatar + Name */}
              <div
                className="flex items-center gap-3 flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFriend) setSelectedUser(user);
                  else toast("Add as friend to chat");
                }}
              >
                <SafeImage
                  src={user.profilePic}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-md"
                />

                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {user.fullName}
                    {onlineUsers.includes(user._id) && (
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                    )}
                  </p>

                  <p className="text-[11px] text-gray-400">@{user.username}</p>

                  <p className="text-xs mt-1">
                    {typingUsers?.[user._id] ? (
                      <span className="text-violet-400 animate-pulse">
                        typing...
                      </span>
                    ) : onlineUsers.includes(user._id) ? (
                      <span className="text-green-400">Online</span>
                    ) : (
                      <span className="text-gray-400">Offline</span>
                    )}
                  </p>

                  {/* Friend Request UI */}
                  <div className="mt-1">
                    {!isFriend ? (
                      hasSentMeRequest ? (
                        <button
                          className="text-green-400 text-xs underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptRequest(user._id);
                          }}
                        >
                          Accept Request
                        </button>
                      ) : iSentRequest ? (
                        <span className="text-gray-300 text-xs">Pending...</span>
                      ) : (
                        <button
                          className="text-blue-400 text-xs underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(user._id, user.username);
                          }}
                        >
                          Add Friend
                        </button>
                      )
                    ) : (
                      <button
                        className="text-violet-400 text-xs underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                        }}
                      >
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Unseen Badge */}
              {unseenMessages?.[user._id] > 0 && (
                <span className="bg-violet-600 text-xs px-2 py-1 rounded-full">
                  {unseenMessages[user._id]}
                </span>
              )}

              {/* Delete Popup */}
              {showDeleteFor === user._id && (
                <div
                  className="absolute right-3 top-3 bg-black/70 border border-white/10 text-white rounded-md px-3 py-2 text-xs space-y-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-gray-300 text-[11px] font-semibold">
                    {user.fullName}
                  </p>

                  <p
                    className="cursor-pointer hover:text-red-400"
                    onClick={() => handleDeleteUserChat(user._id, user.fullName)}
                  >
                    Delete Chat
                  </p>
                  <p
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => handleDeleteUser(user._id, user.fullName)}
                  >
                    Delete User
                  </p>

                  <p
                    className="cursor-pointer text-gray-400 pt-1 border-t border-white/10"
                    onClick={() => setShowDeleteFor(null)}
                  >
                    Cancel
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
