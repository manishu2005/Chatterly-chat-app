import User from "../models/user.js";
import { io, userSocketmap } from "../socket.js";

// Get all friend requests received by the user
export const getAddedMe = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("receivedRequests", "-password");

    res.json({ success: true, requests: user.receivedRequests || [] });
  } catch (error) {
    console.error("getAddedMe error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
      const { data } = await axios.post("/api/friends/send", { toUsername: username });
    const senderId = req.user._id;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.json({ success: false, message: "Recipient ID required" });
    }

    if (senderId.toString() === recipientId.toString()) {
      return res.json({ success: false, message: "Cannot send request to yourself" });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.json({ success: false, message: "User not found" });
    }

    // Check if already friends
    if (sender.friends.includes(recipientId)) {
      return res.json({ success: false, message: "Already friends" });
    }

    // Check if request already sent
    if (sender.sentRequests.includes(recipientId)) {
      return res.json({ success: false, message: "Request already sent" });
    }

    // Check if request already received
    if (sender.receivedRequests.includes(recipientId)) {
      return res.json({ success: false, message: "Request already received from this user" });
    }

    // Add to sent and received arrays
    sender.sentRequests.push(recipientId);
    recipient.receivedRequests.push(senderId);

    await sender.save();
    await recipient.save();

    // Emit socket event to recipient
    const recipientSocketId = userSocketmap[recipientId.toString()];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("new-request", { fromUserId: senderId });
    }

    res.json({ success: true, message: "Friend request sent" });
  } catch (error) {
    console.error("sendFriendRequest error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fromUserId } = req.body;

    if (!fromUserId) {
      return res.json({ success: false, message: "From user ID required" });
    }

    const user = await User.findById(userId);
    const requester = await User.findById(fromUserId);

    if (!requester) {
      return res.json({ success: false, message: "User not found" });
    }

    // Check if request exists
    if (!user.receivedRequests.includes(fromUserId)) {
      return res.json({ success: false, message: "No request from this user" });
    }

    // Add to friends list
    user.friends.push(fromUserId);
    requester.friends.push(userId);

    // Remove from request lists
    user.receivedRequests = user.receivedRequests.filter(
      (id) => id.toString() !== fromUserId.toString()
    );
    requester.sentRequests = requester.sentRequests.filter(
      (id) => id.toString() !== userId.toString()
    );

    await user.save();
    await requester.save();

    // Emit socket event
    const requesterSocketId = userSocketmap[fromUserId.toString()];
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("accept-request", { acceptedBy: userId });
    }

    res.json({ success: true, message: "Friend request accepted" });
  } catch (error) {
    console.error("acceptFriendRequest error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Reject or cancel a friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fromUserId } = req.body;

    if (!fromUserId) {
      return res.json({ success: false, message: "From user ID required" });
    }

    const user = await User.findById(userId);
    const requester = await User.findById(fromUserId);

    if (!requester) {
      return res.json({ success: false, message: "User not found" });
    }

    // Remove from received requests
    user.receivedRequests = user.receivedRequests.filter(
      (id) => id.toString() !== fromUserId.toString()
    );

    // Remove from sent requests
    requester.sentRequests = requester.sentRequests.filter(
      (id) => id.toString() !== userId.toString()
    );

    await user.save();
    await requester.save();

    res.json({ success: true, message: "Friend request rejected" });
  } catch (error) {
    console.error("rejectFriendRequest error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get all friends of a user
export const getFriends = async (req, res) => {
  try {
    const userId = req.params.id || req.user._id;
    const user = await User.findById(userId).populate("friends", "-password");

    res.json({ success: true, friends: user.friends || [] });
  } catch (error) {
    console.error("getFriends error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Remove a friend
export const removeFriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.body;

    if (!friendId) {
      return res.json({ success: false, message: "Friend ID required" });
    }

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.json({ success: false, message: "User not found" });
    }

    // Remove from friends
    user.friends = user.friends.filter((id) => id.toString() !== friendId.toString());
    friend.friends = friend.friends.filter((id) => id.toString() !== userId.toString());

    await user.save();
    await friend.save();

    res.json({ success: true, message: "Friend removed" });
  } catch (error) {
    console.error("removeFriend error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
