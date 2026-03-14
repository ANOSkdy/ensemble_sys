const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { neon } = require("@neondatabase/serverless")

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL is not set")
}

const sql = neon(databaseUrl)

async function main() {
  const tables = await sql`
    select
      table_schema,
      table_name
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema')
      and table_type = 'BASE TABLE'
    order by table_schema, table_name
  `

  const columns = await sql`
    select
      table_schema,
      table_name,
      column_name,
      ordinal_position,
      data_type,
      udt_name,
      is_nullable,
      column_default
    from information_schema.columns
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name, ordinal_position
  `

  const constraints = await sql`
    select
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_schema as foreign_table_schema,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    from information_schema.table_constraints tc
    left join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
      and tc.table_name = kcu.table_name
    left join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
      and tc.table_schema = ccu.table_schema
    where tc.table_schema not in ('pg_catalog', 'information_schema')
    order by tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
  `

  const indexes = await sql`
    select
      schemaname as table_schema,
      tablename as table_name,
      indexname,
      indexdef
    from pg_indexes
    where schemaname not in ('pg_catalog', 'information_schema')
    order by schemaname, tablename, indexname
  `

  const snapshot = {
    generatedAt: new Date().toISOString(),
    tables,
    columns,
    constraints,
    indexes,
  }

  const outPath = path.join(
    process.cwd(),
    "Docs",
    "db",
    `neon-live-schema-snapshot.json`
  )

  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8")
  console.log(`Wrote: ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
