// src/pages/Contacts.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import SafeImage from "../components/SafeImage";
import { useNavigate } from "react-router-dom";

const Contacts = () => {
  const { axios, authUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]); // ids
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  /* ------------ LOAD FRIENDS + REQUESTS ONCE ------------ */
  const loadLists = async () => {
    try {
      setLoadingLists(true);

      // 1) My friends
      const friendsRes = await axios.get("/api/friends/friends");
      if (friendsRes.data.success) {
        setFriends(friendsRes.data.friends || []);
      }

      // 2) Incoming requests
      const incomingRes = await axios.get("/api/friends/incoming");
      if (incomingRes.data.success) {
        setReceivedRequests(incomingRes.data.requests || []);
      }

      // 3) My sent requests (from auth/check)
      const meRes = await axios.get("/api/auth/check");
      if (meRes.data.success) {
        setSentRequests(meRes.data.user.sentRequests || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load contacts");
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  /* ------------ LIVE SEARCH (name / username) ------------ */
  useEffect(() => {
    const q = searchInput.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const id = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const { data } = await axios.get(
          `/api/friends/search?q=${encodeURIComponent(q)}`
        );
        if (data.success) {
          // exclude myself just in case
          const filtered = (data.users || []).filter(
            (u) => u._id !== authUser._id
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error(err);
        toast.error("Search failed");
      } finally {
        setSearchLoading(false);
      }
    }, 400); // small debounce

    return () => clearTimeout(id);
  }, [searchInput, axios, authUser?._id]);

  /* ------------ HELPERS ------------ */
  const isFriend = (userId) =>
    friends.some((f) => f._id.toString() === userId.toString());

  const hasSentRequest = (userId) =>
    sentRequests.map(String).includes(userId.toString());

  const hasReceivedRequest = (userId) =>
    receivedRequests.some((r) => r._id.toString() === userId.toString());

  /* ------------ ACTIONS ------------ */
  const sendFriendRequest = async (username) => {
    try {
      const { data } = await axios.post("/api/friends/send", {
        toUsername: username,
      });
      if (!data.success) {
        return toast.error(data.message || "Request failed");
      }
      toast.success("Friend request sent");
      loadLists();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to send friend request"
      );
    }
  };

  const acceptRequest = async (fromUserId) => {
    try {
      const { data } = await axios.post(`/api/friends/accept/${fromUserId}`);
      if (data.success) {
        toast.success("Friend added");
        loadLists();
      } else {
        toast.error(data.message || "Failed to accept");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept request");
    }
  };

  const rejectRequest = async (fromUserId) => {
    try {
      const { data } = await axios.post(`/api/friends/reject/${fromUserId}`);
      if (data.success) {
        toast.success("Request rejected");
        loadLists();
      } else {
        toast.error(data.message || "Failed to reject");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm("Remove this friend?")) return;
    try {
      const { data } = await axios.post("/api/friends/remove", { friendId });
      if (data.success) {
        toast.success("Friend removed");
        loadLists();
      } else {
        toast.error(data.message || "Failed to remove friend");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove friend");
    }
  };

  /* ------------ UI ------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            👥 Contacts
          </h1>
          <button
            onClick={() => navigate("/")}
            className="bg-violet-600 hover:bg-violet-700 px-6 py-2 rounded-lg text-white font-semibold transition-all"
          >
            Back to Chat
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="mb-8">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users by name or username..."
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-violet-400 focus:bg-white/15 transition-all"
          />
          {searchLoading && (
            <p className="mt-1 text-xs text-gray-400">Searching...</p>
          )}
        </div>

        {loadingLists ? (
          <div className="text-center text-gray-400">Loading contacts…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FRIENDS SECTION */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                👫 Friends ({friends.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {friends.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No friends yet
                  </p>
                ) : (
                  friends.map((f) => (
                    <div
                      key={f._id}
                      className="flex items-center justify-between bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <SafeImage
                          src={f.profilePic}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">
                            {f.fullName}
                          </p>
                          <p className="text-xs text-gray-400">
                            @{f.username}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFriend(f._id)}
                        className="bg-red-500/30 hover:bg-red-500 text-red-200 hover:text-white px-3 py-1 rounded text-xs font-semibold transition-all flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* INCOMING REQUESTS */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                💬 Requests ({receivedRequests.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {receivedRequests.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No friend requests
                  </p>
                ) : (
                  receivedRequests.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <SafeImage
                          src={r.profilePic}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">
                            {r.fullName}
                          </p>
                          <p className="text-xs text-gray-400">
                            @{r.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => acceptRequest(r._id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => rejectRequest(r._id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all"
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* DISCOVER USERS (search results) */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                🔍 Discover Users
              </h2>

              {!searchInput.trim() && (
                <p className="text-gray-400 text-sm mb-3">
                  Type a name or username to search.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {searchInput.trim() && searchResults.length === 0 && !searchLoading && (
                  <p className="text-gray-400 text-center col-span-full">
                    No users found for "{searchInput.trim()}"
                  </p>
                )}

                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-violet-400/50 transition-all"
                  >
                    <SafeImage
                      src={u.profilePic}
                      className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                    />
                    <p className="text-white font-semibold text-center truncate">
                      {u.fullName}
                    </p>
                    <p className="text-xs text-gray-400 text-center">
                      @{u.username}
                    </p>
                    {u.bio && (
                      <p className="text-xs text-gray-400 text-center mt-2 line-clamp-2">
                        {u.bio}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-white/10">
                      {isFriend(u._id) ? (
                        <span className="text-green-400 text-xs font-semibold block text-center">
                          ✓ Friend
                        </span>
                      ) : hasReceivedRequest(u._id) ? (
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => acceptRequest(u._id)}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded py-1 font-semibold transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectRequest(u._id)}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded py-1 font-semibold transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      ) : hasSentRequest(u._id) ? (
                        <span className="text-yellow-400 text-xs font-semibold block text-center">
                          ⏳ Request Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(u.username)}
                          className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded py-1 text-xs font-semibold transition-all"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;
