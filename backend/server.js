// server.js (or index.js)
import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";

import userRouter from "./routes/userroutes.js";
import messageRouter from "./routes/messageroutes.js";
import friendRoutes from "./routes/friendroutes.js";

import User from "./models/user.js";
import Message from "./models/message.js";
import cloudinary from "./lib/cloudinary.js";
import { initSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);

// Initialize socket
initSocket(server);

// Middleware
app.use(express.json({ limit: "4MB" }));
app.use(cors());

// Routes
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/friends", friendRoutes);

// DELETE USER + all messages (keep for your frontend)
app.delete("/api/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.profilePic) {
      try {
        const url = user.profilePic;
        const parts = url.split("/");
        const uploadIndex = parts.findIndex((p) => p === "upload");

        if (uploadIndex !== -1) {
          const publicIdParts = parts.slice(uploadIndex + 2);
          let publicId = publicIdParts.join("/");
          publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, "");
          if (publicId) await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudErr) {
        console.error(
          "Failed to delete cloudinary image for user",
          userId,
          cloudErr
        );
      }
    }

    await Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "User deleted fully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Delete failed", err });
  }
});

// DB + Server Start
await connectDB();
const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`🚀 Server running on PORT ${PORT}`)
);
