// routes/friendRoutes.js
import express from "express";
import { protectRoute } from "../middleware/auth.js";
import User from "../models/user.js";
import { io, userSocketmap } from "../socket.js";

const router = express.Router();

/* ---------------------------------------------------
   GET INCOMING FRIEND REQUESTS (Added Me)
--------------------------------------------------- */
router.get("/incoming", protectRoute, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate("receivedRequests", "-password")
      .lean();

    return res.json({ success: true, requests: me.receivedRequests || [] });
  } catch (err) {
    console.error("GET /incoming error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------------
   GET FRIEND LIST
--------------------------------------------------- */
router.get("/friends", protectRoute, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate("friends", "-password")
      .lean();

    return res.json({ success: true, friends: me.friends || [] });
  } catch (err) {
    console.error("GET /friends error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------------
   SEARCH USERS
--------------------------------------------------- */
router.get("/search-user/:query", protectRoute, async (req, res) => {
  try {
    const q = req.params.query.trim();
    if (!q) return res.json({ success: true, users: [] });

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id fullName username profilePic bio sentRequests receivedRequests")
      .lean();

    return res.json({ success: true, users });
  } catch (err) {
    console.error("GET /search-user error:", err);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
});

/* ---------------------------------------------------
   SEND FRIEND REQUEST
--------------------------------------------------- */
router.post("/send", protectRoute, async (req, res) => {
  try {
    const senderId = req.user._id.toString();
    const recipientId = req.body?.recipientId?.toString();

    if (!recipientId || recipientId.length !== 24) {
      return res.json({ success: false, message: "Invalid recipient ID" });
    }

    if (senderId === recipientId) {
      return res.json({ success: false, message: "Cannot send request to yourself" });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!recipient || !recipient.username) {
      return res.json({ success: false, message: "Recipient does not exist" });
    }

    sender.sentRequests ??= [];
    sender.receivedRequests ??= [];
    sender.friends ??= [];

    recipient.sentRequests ??= [];
    recipient.receivedRequests ??= [];
    recipient.friends ??= [];

    // Already friends?
    if (sender.friends.includes(recipientId)) {
      return res.json({ success: false, type: "already_friends", message: "Already friends" });
    }

    // Already sent?
    if (sender.sentRequests.includes(recipientId)) {
      return res.json({ success: false, type: "already_sent", message: "Already sent" });
    }

    // Mutual: auto friends
    if (sender.receivedRequests.includes(recipientId)) {
      sender.receivedRequests = sender.receivedRequests.filter((id) => id.toString() !== recipientId);
      recipient.sentRequests = recipient.sentRequests.filter((id) => id.toString() !== senderId);

      sender.friends.push(recipientId);
      recipient.friends.push(senderId);

      await sender.save();
      await recipient.save();

      const sSock = userSocketmap[senderId];
      const rSock = userSocketmap[recipientId];

      if (sSock) io.to(sSock).emit("friend-request-accepted", { userId: recipientId });
      if (rSock) io.to(rSock).emit("friend-request-accepted", { userId: senderId });

      return res.json({ success: true, type: "mutual", message: "Now friends!" });
    }

    // New request
    sender.sentRequests.push(recipientId);
    recipient.receivedRequests.push(senderId);

    await sender.save();
    await recipient.save();

    const rSock = userSocketmap[recipientId];
    if (rSock) io.to(rSock).emit("new-request", { fromUserId: senderId });

    return res.json({ success: true, type: "sent", message: "Friend request sent" });
  } catch (err) {
    console.error("POST /send error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------------------------------------------------
   CANCEL / UNDO REQUEST
--------------------------------------------------- */
router.post("/cancel", protectRoute, async (req, res) => {
  try {
    const senderId = req.user._id.toString();
    const recipientId = req.body?.recipientId?.toString();

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    sender.sentRequests = sender.sentRequests.filter((id) => id.toString() !== recipientId);
    recipient.receivedRequests = recipient.receivedRequests.filter((id) => id.toString() !== senderId);

    await sender.save();
    await recipient.save();

    const rSock = userSocketmap[recipientId];
    if (rSock) io.to(rSock).emit("request-cancelled", { fromUserId: senderId });

    return res.json({ success: true, message: "Request cancelled" });
  } catch (err) {
    console.error("POST /cancel error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------------
   ACCEPT REQUEST
--------------------------------------------------- */
router.post("/accept", protectRoute, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const fromUserId = req.body?.fromUserId?.toString();

    const me = await User.findById(myId);
    const from = await User.findById(fromUserId);

    me.receivedRequests = me.receivedRequests.filter((id) => id.toString() !== fromUserId);
    from.sentRequests = from.sentRequests.filter((id) => id.toString() !== myId);

    if (!me.friends.includes(fromUserId)) me.friends.push(fromUserId);
    if (!from.friends.includes(myId)) from.friends.push(myId);

    await me.save();
    await from.save();

    const fSock = userSocketmap[fromUserId];
    if (fSock) io.to(fSock).emit("friend-request-accepted", { userId: myId });

    return res.json({ success: true, message: "Friend request accepted" });
  } catch (err) {
    console.error("POST /accept error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------------
   REJECT REQUEST
--------------------------------------------------- */
router.post("/reject", protectRoute, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const fromUserId = req.body?.fromUserId?.toString();

    const me = await User.findById(myId);
    const from = await User.findById(fromUserId);

    me.receivedRequests = me.receivedRequests.filter((id) => id.toString() !== fromUserId);
    from.sentRequests = from.sentRequests.filter((id) => id.toString() !== myId);

    await me.save();
    await from.save();

    return res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    console.error("POST /reject error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------------
   REMOVE FRIEND
--------------------------------------------------- */
router.post("/remove", protectRoute, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const friendId = req.body?.friendId?.toString();

    const me = await User.findById(myId);
    const friend = await User.findById(friendId);

    me.friends = me.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== myId);

    await me.save();
    await friend.save();

    return res.json({ success: true, message: "Friend removed" });
  } catch (err) {
    console.error("POST /remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
