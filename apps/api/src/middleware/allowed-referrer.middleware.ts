import type { NextFunction, Request, Response } from "express";
import { isDev } from "../config.js";

export default function createAllowedReferrerMiddleware(customReferrer: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isDev) {
      const referringRoute = req.get("Referrer");

      if (referringRoute?.includes(customReferrer)) {
        next();
      } else {
        return res.status(403).json({ error: "Unauthorized access" });
      }
    } else {
      next();
    }
  };
}
