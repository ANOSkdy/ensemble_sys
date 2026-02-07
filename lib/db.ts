import "server-only";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL or NEON_DATABASE_URL");
  }
  return url;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const client = await getPool().connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL);
}
