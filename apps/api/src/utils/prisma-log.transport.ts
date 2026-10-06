// Replaces the winston-mongodb transport: writes log entries to the `logs` table.
import Transport from "winston-transport";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

type LogInfo = { level: string; message: unknown; timestamp?: string; [key: string]: unknown };

export default class PrismaLogTransport extends Transport {
  override log(info: LogInfo, callback: () => void) {
    setImmediate(() => this.emit("logged", info));

    const { level, message, timestamp, ...meta } = info;
    prisma.log
      .create({
        data: {
          level,
          message: typeof message === "string" ? message : JSON.stringify(message),
          meta: Object.keys(meta).length ? (JSON.parse(JSON.stringify(meta)) as Prisma.InputJsonValue) : undefined,
          timestamp: timestamp ? new Date(timestamp) : undefined,
        },
      })
      // A logging failure must never take the request down with it.
      .catch((error: unknown) => console.error("Failed to write log to database", error))
      .finally(callback);
  }
}
