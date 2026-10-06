import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET, SECRET_KEY } from "../config.js";

const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const scopedAuth = req.headers["scoped-auth"];
  if (SECRET_KEY && scopedAuth === SECRET_KEY) return next();

  const authorization = req.headers.authorization;
  const token = authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: "Authorization token expired" });
    req.user = user;
    next();
  });
};

export default sessionMiddleware;
