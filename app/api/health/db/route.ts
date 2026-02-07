import { NextResponse } from "next/server";
import { hasDatabaseUrl, query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, db: false, error: "MISSING_DATABASE_URL" },
      { status: 503 }
    );
  }

  try {
    await query("SELECT 1");
    return NextResponse.json({ ok: true, db: true });
  } catch (error) {
    return NextResponse.json({ ok: false, db: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
}
