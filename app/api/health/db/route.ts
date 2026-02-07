import { NextResponse } from 'next/server';

import { getDatabaseUrl, query } from '../../../../lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return NextResponse.json({ ok: true, db: false, reason: 'missing_env' });
  }

  try {
    await query('SELECT 1');
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 500 });
  }
}
