import type { Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import logger from "./logger.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Prisma's "record to update/delete does not exist" error. */
export function isRecordNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export function sendError(res: Response, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // The stack only shows the call site; code + meta say what went wrong (e.g. P2021 table missing)
    logger.error("Database error", { code: error.code, meta: error.meta, error: error.message });
    if (error.code === "ECONNREFUSED" || error.code === "P1001") {
      return res
        .status(503)
        .json({ message: "Database is unreachable. Check DATABASE_URL and that Postgres is running." });
    }
    if (error.code === "P2021" || error.code === "P2022") {
      return res
        .status(500)
        .json({ message: "Database schema is out of date. Run `pnpm db:migrate` and restart the API." });
    }
  } else {
    logger.error("Unhandled request error", { error: error instanceof Error ? error.stack : String(error) });
  }
  return res.status(500).json({ message: "Server internal error." });
}
