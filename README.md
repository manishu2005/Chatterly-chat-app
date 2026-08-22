# Chatterly — Real-time Chat App

A full-stack real-time chat application with user auth, messaging, presence, typing indicators, and peer-to-peer calling support (WebRTC signaling through Socket.IO). This repository contains two main parts: a Node/Express/MongoDB backend and a React + Vite frontend.

---

## Quick overview

- Backend: Node.js (ESM), Express, Socket.IO, Mongoose, JWT, Cloudinary support for user images.
- Frontend: React + Vite, Material UI, Tailwind utility, Socket.IO client.
- Database: MongoDB (connects to `${MONGODB_URI}/chat-app`).
- Web sockets power real-time features: presence, typing, seen receipts, calls, friend requests.

---

## Repo structure

- /backend — Express API, Socket.IO server, Mongoose models
  - server.js — main server start + routes
  - socket.js — Socket.IO initialization and event handling
  - lib/db.js — MongoDB connection (connects to `${process.env.MONGODB_URI}/chat-app`)
  - routes, models, controllers, middleware directories
- /frontend — React + Vite UI
  - .env contains VITE_BACKEND_URL
  - src, public, vite.config.js, package.json

---

## Prerequisites

- Node.js (v18+ recommended)
- npm (or pnpm/yarn)
- MongoDB instance (Atlas or local)
- Cloudinary account (optional — used for profile image uploads)
- PORT 5000 recommended for backend; frontend runs with Vite (default 5173)

---

## Environment variables

Create a `.env` under `backend/` (example):

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017           # or your Atlas connection string (without the /chat-app suffix)
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Frontend `.env` (already included as `frontend/.env`):

```env
# frontend/.env
VITE_BACKEND_URL='http://localhost:5000'
```

Note: db.js appends `/chat-app` to the MONGODB_URI when connecting, so point MONGODB_URI to the base host.

---

## Install & run (local)

Backend:

```bash
# from repository root
cd backend
npm install

# development (uses nodemon)
npm run server

# or production
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev        # starts Vite dev server
# build for production
npm run build
npm run preview
```

After both are running, open the frontend dev server URL (Vite will print it, typically http://localhost:5173). The frontend expects the backend to be reachable at VITE_BACKEND_URL.

---

## API endpoints (high-level)

The server exposes (in server.js):

- GET /api/status — health-check (returns "Server is live")
- /api/auth — authentication and user-related routes (register/login/profile)
- /api/messages — message CRUD / fetch endpoints
- /api/friends — friend request and friends management
- DELETE /api/user/:id — deletes a user and their messages (also attempts to delete Cloudinary image if present)

Use the frontend routes and controllers as examples for request/response shapes.

---

## Socket events (server-side signaling and real-time behavior)

The Socket.IO server implements these events. Clients should emit/handle these accordingly:

- register (client → server): register user after login
  - payload: userId
  - server emits `getOnlineUsers` to update presence

Calling / WebRTC signaling:
- call-user (client → server): initiate call
  - payload: { fromUserId, toUserId, offer, withVideo }
- incoming-call (server → callee): contains { roomId, offer, fromUserId, withVideo }
- accept-call (client → server): callee accepts, sends SDP answer
  - payload: { roomId, answer, toUserId }
- call-accepted (server → caller): contains { answer, roomId }
- ice-candidate (client → server → others in room): exchange ICE candidates
  - payload: { roomId, candidate }
- end-call (client → server → others): ends a call
  - payload: { roomId }
- user-busy (server → caller): emitted if callee is busy
- call-timeout (server → both): emitted if call unanswered in 30s
- call-ended (server → peers): call ended

Messaging / presence:
- typing / stop-typing: send typing indicators to a specific user
  - payload: { toUserId }
- mark-seen: client marks messages as seen; server updates DB and emits:
  - `seen-updated` (to the marking user) and `messages-seen` (to the sender)
  - payload example: { byUserId, forUserId }
- getOnlineUsers (server → all): list of online user IDs

Friend requests:
- send-request (client → server) → server emits `new-request` to receiver
  - payload: { toUserId, fromUser }
- accept-request (client → server) → server emits `request-accepted` to receiver

Other:
- disconnect: cleans up user presence and active calls, updates lastSeen

Refer to `backend/socket.js` for exact behaviors and payload structures.



If you want, I can:
- Draft the README as a file and add it to the repo, or
- Extract and document specific API routes and payload examples from controllers for more detailed docs.
