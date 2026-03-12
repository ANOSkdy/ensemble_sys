import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"

export const runtime = "nodejs"

export async function GET() {
  try {
    const rows = await sql`select now() as now, current_database() as database`
    return NextResponse.json({ ok: true, rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { ok: false, error: "database connection failed" },
      { status: 500 }
    )
  }
}
