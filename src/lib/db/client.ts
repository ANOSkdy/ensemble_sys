import "server-only"
import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL is not set.")
}

export const sql = neon(databaseUrl)
