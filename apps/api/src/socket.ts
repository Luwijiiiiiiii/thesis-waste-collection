// The Socket.IO server lives in its own module so services can import `io` to emit events
// without importing server.ts (which would start listening).
import { Server } from "socket.io";
import { CORS_ORIGIN } from "./config.js";
import events from "./events/index.js";

export const io = new Server({
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: CORS_ORIGIN !== "*",
  },
});

events(io);
