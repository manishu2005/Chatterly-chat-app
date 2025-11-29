// src/pages/AddedMe.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import SafeImage from "../components/SafeImage";
import { useNavigate } from "react-router-dom";

const AddedMe = () => {
  const { axios, socket, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const currentUserId = user?._id;

  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("requests");

  /* ------------------------ LOAD REQUESTS ------------------------ */
  const loadRequests = async () => {
    try {
      const { data } = await axios.get("/api/friends/incoming");
      if (data.success) setRequests(data.requests);
    } catch {
      toast.error("Failed to load requests");
    }
  };

  /* ------------------------ LOAD FRIENDS ------------------------- */
  const loadFriends = async () => {
    try {
      const { data } = await axios.get("/api/friends/friends");
      if (data.success) setFriends(data.friends);
    } catch {
      toast.error("Failed to load friends");
    }
  };

  /* ------------------------ INITIAL LOAD ------------------------- */
  useEffect(() => {
    loadRequests();
    loadFriends();
  }, []);

  /* ------------------------ SOCKET LISTENERS --------------------- */
  useEffect(() => {
    if (!socket) return;

    socket.on("new-request", () => {
      loadRequests();
      handleSearch();
    });

    socket.on("friend-request-accepted", () => {
      loadRequests();
      loadFriends();
      handleSearch();
    });

    socket.on("request-cancelled", () => {
      loadRequests();
      loadFriends();
      handleSearch();
    });

    return () => {
      socket.off("new-request");
      socket.off("friend-request-accepted");
      socket.off("request-cancelled");
    };
  }, [socket]);

  /* ------------------------ ACCEPT REQUEST ------------------------ */
  const accept = async (uid) => {
    try {
      const { data } = await axios.post("/api/friends/accept", {
        fromUserId: uid,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to accept");
        return;
      }

      toast.success("Friend added!");

      loadRequests();
      loadFriends();
      handleSearch();

      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      toast.error("Failed to accept request");
    }
  };

  /* ------------------------ REJECT REQUEST ------------------------ */
  const reject = async (uid) => {
    try {
      await axios.post("/api/friends/reject", { fromUserId: uid });
      toast.success("Request removed");
      loadRequests();
      handleSearch();
    } catch {
      toast.error("Failed to reject");
    }
  };

  /* ------------------------ CANCEL (UNDO) REQUEST ----------------- */
  const cancelRequest = async (recipientId) => {
    try {
      const { data } = await axios.post("/api/friends/cancel", {
        recipientId,
      });

      toast.success("Request cancelled");

      loadRequests();
      loadFriends();
      handleSearch();
    } catch (err) {
      toast.error("Failed to cancel request");
    }
  };

  /* ------------------------ SEND REQUEST -------------------------- */
  const sendFriendRequest = async (recipientId) => {
    try {
      const { data } = await axios.post("/api/friends/send", {
        recipientId,
      });

      if (data.type === "already_sent") {
        toast("Already sent", { icon: "⏳" });
        return;
      }

      if (data.type === "already_friends") {
        toast("Already friends", { icon: "✓" });
        return;
      }

      if (data.type === "mutual") {
        toast.success("You are now friends!");
        loadFriends();
        loadRequests();
        handleSearch();
        return;
      }

      toast.success("Friend request sent");
      handleSearch();
    } catch (err) {
      toast.error("Failed to send request");
    }
  };

  /* ------------------------ SEARCH USERS -------------------------- */
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResult([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.get(
        `/api/friends/search-user/${searchQuery}`
      );

      if (data.success) {
        const normalized = data.users.map((u) => ({
          ...u,
          sentRequests: Array.isArray(u.sentRequests)
            ? u.sentRequests.map(String)
            : [],
          receivedRequests: Array.isArray(u.receivedRequests)
            ? u.receivedRequests.map(String)
            : [],
        }));

        setSearchResult(normalized);
      } else {
        setSearchResult([]);
      }
    } catch {
      toast.error("Search failed");
      setSearchResult([]);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------ HELPER FUNCTIONS ---------------------- */
  const isFriend = (uid) =>
    friends.some((f) => f._id === uid || f._id === String(uid));

  const pendingByMe = (u) =>
    u.receivedRequests?.includes(String(currentUserId));

  const pendingByThem = (u) =>
    u.sentRequests?.includes(String(currentUserId));

  /* ------------------------ UI ----------------------------------- */

  return (
    <div className="h-full text-white p-5 bg-black/20 backdrop-blur-lg overflow-y-auto">

      {/* ------------------------ TAB HEADER ------------------------ */}
      <div className="flex gap-4 mb-6 border-b border-white/20 pb-3">
        {["requests", "friends", "search"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-semibold transition-all ${
              tab === t
                ? "text-violet-400 border-b-2 border-violet-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "requests"
              ? `Requests (${requests.length})`
              : t === "friends"
              ? `Friends (${friends.length})`
              : "Find Friends"}
          </button>
        ))}
      </div>

      {/* ------------------------ REQUESTS TAB ------------------------ */}
      {tab === "requests" && (
        <div>
          <h2 className="text-2xl font-bold mb-6">👤 Friend Requests</h2>

          {requests.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">No friend requests</p>
          ) : (
            <div className="flex flex-col gap-4">
              {requests.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/10 hover:border-violet-400/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <SafeImage src={u.profilePic} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-semibold">{u.fullName}</p>
                      <p className="text-xs text-gray-300">@{u.username}</p>
                      <p className="text-xs text-gray-400">{u.bio}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => accept(u._id)}
                      className="bg-green-500 px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => reject(u._id)}
                      className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------ FRIENDS TAB ------------------------ */}
      {tab === "friends" && (
        <div>
          <h2 className="text-2xl font-bold mb-6">👥 My Friends</h2>

          {friends.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">No friends yet</p>
          ) : (
            <div className="flex flex-col gap-4">
              {friends.map((f) => (
                <div
                  key={f._id}
                  className="flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/10 hover:border-violet-400/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <SafeImage src={f.profilePic} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-semibold">{f.fullName}</p>
                      <p className="text-xs text-gray-300">@{f.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Remove friend?")) removeFriend(f._id);
                    }}
                    className="bg-red-500/30 hover:bg-red-500 px-4 py-2 rounded-lg text-red-200 hover:text-white transition-all"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------ SEARCH TAB ------------------------ */}
      {tab === "search" && (
        <div>
          <h2 className="text-2xl font-bold mb-6">🔍 Find Friends</h2>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by username or full name..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none"
            />

            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-violet-600 px-6 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {Array.isArray(searchResult) && searchResult.length > 0 && (
            <div className="flex flex-col gap-4">
              {searchResult.map((u) => (
                <div
                  key={u._id}
                  className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <SafeImage src={u.profilePic} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-semibold">{u.fullName}</p>
                      <p className="text-xs text-gray-300">@{u.username}</p>
                      <p className="text-xs text-gray-400">{u.bio}</p>
                    </div>
                  </div>

                  <div>
                    {isFriend(u._id) ? (
                      <span className="text-green-400 font-semibold">✓ Friend</span>
                    ) : pendingByThem(u) ? (
                      <span className="text-blue-300 font-semibold">👋 Added you</span>
                    ) : pendingByMe(u) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-semibold">⏳ Pending</span>
                        <button
                          onClick={() => cancelRequest(u._id)}
                          className="text-sm px-3 py-1 rounded bg-gray-700/40 hover:bg-gray-700"
                        >
                          Undo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(u._id)}
                        className="bg-violet-600 px-6 py-2 rounded-lg hover:bg-violet-700"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddedMe;
