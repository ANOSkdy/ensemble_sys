const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { neon } = require("@neondatabase/serverless")

const envPath = path.join(process.cwd(), ".env.local")
if (!fs.existsSync(envPath)) {
  throw new Error(".env.local not found")
}

dotenv.config({ path: envPath })

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL is not set")
}

async function main() {
  const sql = neon(databaseUrl)
  const result = await sql`select now() as now, current_database() as database`
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
