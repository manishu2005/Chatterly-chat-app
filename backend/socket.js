// socket.js
import { Server } from "socket.io";
import Message from "./models/message.js";
import User from "./models/user.js";

export let io;
export const userSocketmap = {};
export const activeCalls = {};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("⚡ Connected:", socket.id);

    // REGISTER USER AFTER LOGIN
    socket.on("register", (userId) => {
      socket.userId = userId;
      userSocketmap[userId] = socket.id;
      io.emit("getOnlineUsers", Object.keys(userSocketmap));
      console.log("User registered:", userId);
    });

    const isUserBusy = (userId) => {
      return Object.values(activeCalls).some((call) =>
        call.users.includes(userId)
      );
    };

    // CALLING EVENTS (unchanged logic)
    socket.on("call-user", ({ fromUserId, toUserId, offer, withVideo }) => {
      console.log(`📞 call-user: ${fromUserId} → ${toUserId}, video=${withVideo}`);
      
      if (isUserBusy(toUserId)) {
        console.log(`🚫 User ${toUserId} is busy`);
        io.to(socket.id).emit("user-busy", { toUserId });
        return;
      }

      const receiverSocket = userSocketmap[toUserId];
      if (!receiverSocket) {
        console.log(`❌ Receiver socket not found for ${toUserId}`);
        return;
      }

      const roomId = `${fromUserId}-${toUserId}`;
      socket.join(roomId);
      console.log(`✅ Caller joined room: ${roomId}`);

      const timeoutId = setTimeout(() => {
        const call = activeCalls[roomId];
        if (!call || call.answered) return;

        io.to(receiverSocket).emit("call-timeout", { roomId });
        io.to(socket.id).emit("call-timeout", { roomId });

        socket.leave(roomId);
        delete activeCalls[roomId];
        console.log("⏰ Call timeout:", roomId);
      }, 30000);

      activeCalls[roomId] = {
        users: [fromUserId, toUserId],
        createdAt: Date.now(),
        answered: false,
        timeoutId,
      };

      io.to(receiverSocket).emit("incoming-call", {
        roomId,
        offer,
        fromUserId,
        withVideo,
      });

      console.log("📢 incoming-call sent to receiver");
    });

    socket.on("accept-call", ({ roomId, answer, toUserId }) => {
      console.log(`✅ accept-call: roomId=${roomId}, fromUser=${toUserId}`);
      
      const receiverSocket = userSocketmap[toUserId];
      if (!receiverSocket) {
        console.log(`❌ Receiver socket not found for ${toUserId}`);
        return;
      }

      const call = activeCalls[roomId];
      if (call) {
        call.answered = true;
        if (call.timeoutId) {
          clearTimeout(call.timeoutId);
          call.timeoutId = null;
        }
        console.log(`✅ Call marked as answered: ${roomId}`);
      }

      socket.join(roomId);
      console.log(`✅ Callee joined room: ${roomId}`);
      
      io.to(receiverSocket).emit("call-accepted", { answer, roomId });
      console.log("📤 call-accepted sent to caller");
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
      console.log(`🧊 ice-candidate: roomId=${roomId}`);
      socket.to(roomId).emit("ice-candidate", { candidate });
    });

    socket.on("end-call", ({ roomId }) => {
      const call = activeCalls[roomId];
      if (call) {
        if (call.timeoutId) clearTimeout(call.timeoutId);
        delete activeCalls[roomId];
      }
      socket.to(roomId).emit("call-ended", { roomId });
      socket.leave(roomId);

      console.log("📵 Call ended:", roomId);
    });

    // TYPING
    socket.on("typing", ({ toUserId }) => {
      const receiverSocketId = userSocketmap[toUserId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { fromUserId: socket.userId });
      }
    });

    socket.on("stop-typing", ({ toUserId }) => {
      const receiverSocketId = userSocketmap[toUserId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop-typing", {
          fromUserId: socket.userId,
        });
      }
    });

    // FRIEND REQUEST EVENTS (correct place now)
    socket.on("send-request", ({ toUserId, fromUser }) => {
      const receiverSocket = userSocketmap[toUserId];
      if (receiverSocket) {
        io.to(receiverSocket).emit("new-request", fromUser);
      }
    });

    socket.on("accept-request", ({ toUserId }) => {
      const receiverSocket = userSocketmap[toUserId];
      if (receiverSocket) {
        io.to(receiverSocket).emit("request-accepted");
      }
    });

    // SEEN EVENTS
    socket.on("mark-seen", async ({ userId }) => {
      try {
        await Message.updateMany(
          {
            senderId: userId,
            receiverId: socket.userId,
            seen: false,
          },
          { seen: true, status: "seen" }
        );

        const senderSocketId = userSocketmap[userId];

        if (userSocketmap[socket.userId]) {
          io.to(userSocketmap[socket.userId]).emit("seen-updated", userId);
        }

        if (senderSocketId) {
          io.to(senderSocketId).emit("messages-seen", {
            byUserId: socket.userId,
            forUserId: userId,
          });
        }
      } catch (err) {
        console.log("Seen update error:", err);
      }
    });

    // DISCONNECT
    socket.on("disconnect", async () => {
      console.log("❌ Disconnected:", socket.userId);

      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          lastSeen: Date.now(),
        });
        delete userSocketmap[socket.userId];
      }

      for (const roomId of Object.keys(activeCalls)) {
        const call = activeCalls[roomId];
        if (call.users.includes(socket.userId)) {
          if (call.timeoutId) clearTimeout(call.timeoutId);
          delete activeCalls[roomId];
          socket.to(roomId).emit("call-ended", { roomId });
        }
      }

      io.emit("getOnlineUsers", Object.keys(userSocketmap));
    });
  });

  return io;
};
