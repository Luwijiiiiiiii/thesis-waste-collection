import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      /** Decoded access token, set by valid-session.middleware. */
      user?: string | JwtPayload;
    }
  }
}
