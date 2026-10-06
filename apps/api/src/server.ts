import { createServer } from "node:http";
import app from "./app.js";
import { PORT } from "./config.js";
import { connectToDatabase, disconnectFromDatabase } from "./utils/prisma.js";

const server = createServer(app);

async function start() {
  await connectToDatabase();

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

async function shutdown() {
  await disconnectFromDatabase();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch((error) => {
  console.error("Failed to start server. Is Postgres running and DATABASE_URL set (apps/api/.env)?", error);
  process.exit(1);
});
