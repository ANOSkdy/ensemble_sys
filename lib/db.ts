import 'server-only';

import { Pool, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || null;
}

export function getPool() {
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: Array<string | number | boolean | null> = [],
) {
  const client = getPool();
  return client.query<T>(text, params);
}
