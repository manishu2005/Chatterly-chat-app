// controllers/messageController.js
import Message from "../models/message.js";
import User from "../models/user.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketmap } from "../socket.js";

// ⚡ SIDEBAR: only FRIENDS of logged-in user
export const getUserForSidebar = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const me = await User.findById(userId)
      .populate("friends", "-password")
      .lean();

    if (!me) {
      return res.json({ success: false, message: "User not found" });
    }

    const friends = me.friends || [];

    // count number of unseen messages from each friend
    const unseenMessages = {};
    const promises = friends.map(async (friend) => {
      const count = await Message.countDocuments({
        senderId: friend._id,
        receiverId: userId,
        seen: false,
        deletedFor: { $ne: userId },
      });
      if (count > 0) {
        unseenMessages[friend._id.toString()] = count;
      }
    });
    await Promise.all(promises);

    res.json({ success: true, users: friends, unseenMessages });
  } catch (error) {
    console.error("getUserForSidebar error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// GET messages with selected friend
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id.toString();

    const messages = await Message.find({
      $and: [
        { deletedFor: { $ne: myId } },
        {
          $or: [
            { senderId: myId, receiverId: selectedUserId },
            { senderId: selectedUserId, receiverId: myId },
          ],
        },
      ],
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId, seen: false },
      { seen: true, status: "seen" }
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error("getMessages error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Mark one message as seen
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndUpdate(id, { seen: true, status: "seen" });
    res.json({ success: true });
  } catch (error) {
    console.error("markMessageAsSeen error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// SEND message – only allowed to FRIENDS
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id.toString();

    if (!text && !image) {
      return res.json({ success: false, message: "Message is empty" });
    }

    const sender = await User.findById(senderId);
    if (!sender) return res.json({ success: false, message: "Sender missing" });

    const isFriend = sender.friends
      .map((id) => id.toString())
      .includes(receiverId.toString());

    if (!isFriend) {
      return res.json({
        success: false,
        message: "You can only message your friends",
      });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: "sent",
    });

    const receiverSocketId = userSocketmap[receiverId?.toString()];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.error("sendMessage error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Soft-delete conversation for current user
export const deleteConversationForMe = async (req, res) => {
  try {
    const selectedUserId = req.params.id;
    const myId = req.user._id.toString();

    await Message.updateMany(
      {
        $or: [
          { senderId: myId, receiverId: selectedUserId },
          { senderId: selectedUserId, receiverId: myId },
        ],
      },
      { $addToSet: { deletedFor: myId } }
    );

    // prune messages deleted by BOTH sides
    try {
      await Message.deleteMany({ deletedFor: { $all: [myId, selectedUserId] } });
    } catch (err) {
      console.error("Error pruning fully-deleted messages", err);
    }

    res.json({ success: true, message: "Conversation deleted for you" });
  } catch (error) {
    console.error("deleteConversationForMe error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Delete a single message (only sender can delete their own)
export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message) {
      return res.json({ success: false, message: "Message not found" });
    }

    // Only sender can delete their message
    if (message.senderId.toString() !== userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // If image exists on Cloudinary, delete it
    if (message.image) {
      try {
        const url = message.image;
        const parts = url.split("/");
        const uploadIndex = parts.findIndex((p) => p === "upload");

        if (uploadIndex !== -1) {
          const publicIdParts = parts.slice(uploadIndex + 2);
          let publicId = publicIdParts.join("/");
          publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, "");
          if (publicId) await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudErr) {
        console.error("Failed to delete image from Cloudinary", cloudErr);
      }
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Notify receiver via socket
    const receiverSocketId = userSocketmap[message.receiverId.toString()];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId });
    }

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("deleteMessage error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
