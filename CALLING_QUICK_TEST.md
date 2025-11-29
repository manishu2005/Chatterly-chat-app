# Quick Testing Guide for Calling System

## How to Test Video/Audio Calling

### Prerequisites
- [ ] Two browser windows/tabs open (or two devices)
- [ ] User A and User B logged in as different users
- [ ] Both users have each other in their friends list (or are discoverable)
- [ ] Microphone and camera permissions granted

### Test Scenario 1: Outgoing Call (Video)

**User A Actions:**
1. Open contacts/chat with User B
2. Click video call icon (or call button)
3. Watch browser console for logs
4. Local video preview should appear

**Expected Console Logs (User A):**
```
📞 Getting user media...
✅ Media stream obtained: audio:true, video:true
📤 Adding audio track to peer connection
📤 Adding video track to peer connection
📹 Setting local video preview
📋 Creating offer...
✅ Offer created and set as local description
📤 Offer sent to server
```

**Server Console Logs:**
```
📞 call-user: userA_id → userB_id, video=true
✅ Caller joined room: userA_id-userB_id
📢 incoming-call sent to receiver
```

---

### Test Scenario 2: Accepting Call (Video)

**User B Actions:**
1. Should see incoming call notification
2. Click "Accept" button

**Expected Console Logs (User B):**
```
📞 Accepting incoming call...
🎤 Getting local media...
✅ Local media obtained: audio:true, video:true
📤 Adding audio track for answer side
📤 Adding video track for answer side
📹 Setting local video preview
🎯 Setting remote description (incoming offer)
✅ Remote description set
🧊 Processing 0 queued ICE candidates
📋 Creating answer...
✅ Answer created and set as local description
📤 Answer sent to caller
```

**Server Console Logs:**
```
✅ accept-call: roomId=userA_id-userB_id, fromUser=userA_id
✅ Callee joined room: userA_id-userB_id
📤 call-accepted sent to caller
```

**User A Console Logs (receiving answer):**
```
✅ Received call-accepted
🤝 Remote description set successfully
🧊 Processing 0 queued ICE candidates
```

---

### Test Scenario 3: Audio Call (Without Video)

**Same as above but:**
- Use audio call icon instead
- Console should show `audio:true` only
- Video refs should remain null
- Only audio track should be added

---

### Test Scenario 4: ICE Candidate Exchange

**Expected logs during connection:**
```
🧊 Sending ICE candidate
📤 ice-candidate: roomId=...
🧊 ICE Connection State: checking
🧊 ICE Connection State: connected
📥 Received remote track: audio
📥 Received remote track: video
🔗 Connection State: connected
```

---

## What Should You See?

### User A (Caller) Screen:
- Local video preview (small, usually top-right)
- Call status: "Ringing..." then "Connected"
- Call timer running

### User B (Callee) Screen:
- User A's video on full screen
- Local video preview small (if showing)
- Audio heard from User A
- Can speak and be heard

---

## Troubleshooting

### Issue: Call never connects
**Check:**
1. Both users are logged in ✓
2. Server console shows no ❌ or "not found" errors
3. Browser shows no permission denials
4. Socket.io connection is active

### Issue: No audio/video
**Logs to check:**
- Should see "📤 Adding audio track" ✓
- Should see "📥 Received remote track" ✓
- Should see "🔗 Connection State: connected" ✓

### Issue: Call rings but receiver doesn't get notification
**Check:**
1. User B is online (check "getOnlineUsers" in console)
2. Server shows "📢 incoming-call sent to receiver"
3. User B's socket is properly registered

### Issue: ICE candidates not flowing
**Logs to check:**
- Should see "🧊 Sending ICE candidate" on both sides
- Should see "🧊 ICE Connection State: checking"
- Should progress to "connected"

---

## Console Filter Tips

### Filter for emoji categories:
- Audio/Video setup: Search for 📤 📥
- ICE: Search for 🧊
- Connection: Search for 🔗
- Errors: Search for ❌
- Success: Search for ✅

### In browser DevTools:
```
// Filter console
//# sourceURL=socket.io  // to see socket messages

// Clear old logs
console.clear()

// Check specific values
console.log(pcRef.current?.connectionState)
console.log(pcRef.current?.iceConnectionState)
```

---

## What's Fixed in This Update?

✅ **Media Track Management**
- Tracks now added to peer connection BEFORE offer/answer creation
- Ensures tracks are available when remote peer receives offer

✅ **SDP Offer/Answer Flow**
- Both wrapped in RTCSessionDescription constructor
- Prevents parsing errors

✅ **ICE Candidate Handling**
- Candidates queued if remote description not ready
- Processed immediately after remote description set
- Prevents "could not process candidate" errors

✅ **Remote Stream Connection**
- Proper callback flow for receiving remote tracks
- Tracks assigned to video/audio elements

✅ **Comprehensive Logging**
- Every major operation logged with emoji indicators
- Easy to follow call progression
- Server logs show event ordering

---

## Common Error Messages & Fixes

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| "ICE error: InvalidStateError" | Remote description not set before adding candidate | Now fixed with candidate queue system |
| "Cannot start call. Check camera/mic permissions." | Permission denied | Grant camera/mic in browser settings |
| "Connection failed" | SDP description parsing error | Now fixed with RTCSessionDescription wrapper |
| "User is busy on another call" | User on another call | Wait for them to finish |
| "Call not answered" | No response after 30s | Try again, user may be away |

---

## Performance Tips

1. **Close unused video tabs** - Multiple active calls consume resources
2. **Use audio-only mode** - Saves bandwidth if video not needed
3. **Check browser performance** - Some systems struggle with WebRTC
4. **Test with good network** - 1Mbps upload/download minimum

---

## Next Steps if Issues Persist

1. Check all console logs match expected order
2. Verify both users appear in each other's contacts
3. Test with different users
4. Test from different network
5. Check if firewall blocks UDP
6. Try different browser

---

## Code Location Reference

- Frontend Calling: `frontend/src/pages/CallScreen.jsx`
- WebRTC Setup: `frontend/src/calling/webrtc.js`
- Backend Signaling: `backend/socket.js`
- Call Listener: `frontend/src/components/CallListener.jsx`
