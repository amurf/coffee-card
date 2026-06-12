import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./shared/src/db/schema.ts",
  out: "./backend/drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./backend/local.db",
  },
})
