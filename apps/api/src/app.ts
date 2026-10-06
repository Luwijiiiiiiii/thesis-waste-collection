// Builds the Express app only. Connecting to the database and listening happen in server.ts,
// so tests can import the app without side effects.
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { BODY_LIMIT, CORS_ORIGIN, isDev, RATE_LIMIT } from "./config.js";
import router from "./routes/index.js";
import { sendError } from "./utils/http-error.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: CORS_ORIGIN,
    // Browsers reject credentialed requests to a wildcard origin.
    credentials: CORS_ORIGIN !== "*",
  }),
);

app.use(express.json({ limit: BODY_LIMIT }));

// Set up rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: RATE_LIMIT, // limit each IP to RATE_LIMIT requests per windowMs
});

if (!isDev) app.use(limiter);

// Set up security headers
app.use(helmet());
app.disable("x-powered-by");

// Use router for routing
app.use("/api", router);

// Body-parser errors (bad JSON, body too large) as JSON instead of Express's HTML error page
app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must be valid JSON." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  return sendError(res, err);
});

export default app;
