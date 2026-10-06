import winston from "winston";
import { isTest } from "../config.js";
import PrismaLogTransport from "./prisma-log.transport.js";

const transports: winston.transport[] = [new winston.transports.Console()];

if (!isTest) {
  transports.push(
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new PrismaLogTransport({ level: "info" }),
  );
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports,
});

export default logger;
