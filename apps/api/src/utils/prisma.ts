// Replaces utils/mongo.ts from the template (MongoClient + getDB + transaction options).
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "../config.js";
import { PrismaClient } from "../generated/prisma/client.js";

// One client per process: each PrismaClient owns its own connection pool.
// The pool settings mirror the template's MongoClient options.
// `prisma migrate` reads `?schema=` from DATABASE_URL, but the driver adapter does not, so pass it on.
const schema = new URL(DATABASE_URL).searchParams.get("schema") ?? undefined;
const adapter = new PrismaPg(
  {
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 60_000,
  },
  { schema },
);

export const prisma = new PrismaClient({
  adapter,
  // Defaults for `prisma.$transaction(async (tx) => ...)`, replacing `useTransactionOptions`.
  transactionOptions: {
    isolationLevel: "ReadCommitted",
    maxWait: 5_000,
    timeout: 10_000,
  },
});

/**
 * Fails at boot on a bad DATABASE_URL instead of on the first request.
 * With a driver adapter `$connect()` opens no connection, so run a real query.
 */
export const connectToDatabase = async () => {
  await prisma.$queryRaw`SELECT 1`;
};

export const disconnectFromDatabase = () => prisma.$disconnect();
