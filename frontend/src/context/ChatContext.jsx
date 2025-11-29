import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { socket, axios } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [typingFrom, setTypingFrom] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const abortControllerRef = useRef(null);

  // ---------------- GET USERS ----------------
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (err) {
      toast.error("Failed to load users");
    }
  };

  // ---------------- GET MESSAGES ----------------
  const getMessages = async (userId) => {
    if (!userId) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const { data } = await axios.get(`/api/messages/${userId}`, {
        signal: abortControllerRef.current.signal,
      });

      if (data.success) {
        setMessages(data.messages || []);

        // Clear unseen badge
        setUnseenMessages((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") toast.error("Failed to load messages");
    }
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async (payload) => {
    if (!selectedUser?._id)
      return toast.error("Select a user to send message");

    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        payload
      );

      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
      }
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  // ---------------- SOCKET EVENTS ----------------
  useEffect(() => {
    if (!socket) return;

    // NEW MESSAGE
    const handleNewMessage = (msg) => {
      if (selectedUser && msg.senderId === selectedUser._id) {
        msg.seen = true;
        setMessages((prev) => [...prev, msg]);

        axios.put(`/api/messages/mark/${msg._id}`).catch(() => {});
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    // TYPING START
    const handleTyping = ({ fromUserId }) => {
      setTypingUsers((prev) => ({ ...prev, [fromUserId]: true }));
      setTypingFrom(fromUserId);
    };

    // TYPING STOP
    const handleStopTyping = ({ fromUserId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[fromUserId];
        return updated;
      });

      if (typingFrom === fromUserId) setTypingFrom(null);
    };

    // MESSAGES SEEN
    const handleSeen = ({ byUserId, forUserId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === forUserId && m.receiverId === byUserId
            ? { ...m, seen: true }
            : m
        )
      );
    };

    // FRIEND REQUEST RECEIVED
    const handleFriendRequestReceived = ({ fromUserId }) => {
      toast(`New friend request from ${fromUserId}`);
      getUsers();
    };

    // FRIEND REQUEST ACCEPTED
    const handleFriendRequestAccepted = () => {
      toast.success("Your friend request was accepted");
      getUsers();
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);
    socket.on("messages-seen", handleSeen);
    socket.on("friend-request-received", handleFriendRequestReceived);
    socket.on("friend-request-accepted", handleFriendRequestAccepted);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
      socket.off("messages-seen", handleSeen);
      socket.off("friend-request-received", handleFriendRequestReceived);
      socket.off("friend-request-accepted", handleFriendRequestAccepted);
    };
  }, [socket, selectedUser, typingFrom]);

  // ---------------- PROVIDER VALUE ----------------
  return (
    <ChatContext.Provider
      value={{
        users,
        getUsers,

        messages,
        setMessages,

        selectedUser,
        setSelectedUser,

        unseenMessages,
        setUnseenMessages,

        typingUsers,
        typingFrom,

        getMessages,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
