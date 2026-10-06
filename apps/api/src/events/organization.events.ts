import type { Server } from "socket.io";

// Namespace per organization owner. Ids are UUIDs now (the template matched 24-char Mongo ObjectIds).
const ORGANIZATION_OWNER_NAMESPACE = /^\/organizations-owner-[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

export default (io: Server) => {
  const namespace = io.of(ORGANIZATION_OWNER_NAMESPACE);

  namespace.on("connection", (socket) => {
    console.log("Client connected to /organization namespace");

    socket.on("disconnect", () => {
      console.log("Client disconnected from /organization namespace");
    });
  });
};
