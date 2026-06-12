import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "@coffee-card/shared/db"
import path from "node:path"

let databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  // Always resolve to the backend directory's local.db using an absolute path
  const absolutePath = path.resolve(__dirname, "../local.db")
  databaseUrl = `file:${absolutePath}`
}

const authToken = process.env.DATABASE_AUTH_TOKEN

export const client = createClient({
  url: databaseUrl,
  authToken: authToken,
})

export const db = drizzle(client, { schema })
