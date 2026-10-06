import type { Server } from "socket.io";
import organizationEvents from "./organization.events.js";

export default function events(io: Server) {
  organizationEvents(io);
}
