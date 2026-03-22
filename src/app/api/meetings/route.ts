import { NextResponse } from "next/server"
import { createMeeting } from "@/lib/db/queries/create-meeting"
import { meetingCreateSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/meetings" })
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = meetingCreateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const created = await createMeeting(parsed.data)

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (error) {
    console.error("POST /api/meetings failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to create meeting" },
      { status: 500 },
    )
  }
}