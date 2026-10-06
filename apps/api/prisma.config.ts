import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` runs on install and in CI without a database, so the URL is only
// required by commands that actually connect (migrate, studio, db push).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
