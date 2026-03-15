import { NextResponse } from "next/server"
import { getRunList } from "@/lib/db/queries/runs"

export const runtime = "nodejs"

export async function GET() {
  try {
    const data = await getRunList()
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("GET /api/runs failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to fetch runs" },
      { status: 500 },
    )
  }
}
