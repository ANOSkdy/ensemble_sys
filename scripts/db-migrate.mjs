import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL or NEON_DATABASE_URL");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "..", "migrations");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const client = await pool.connect();

try {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  const appliedResult = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf-8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
