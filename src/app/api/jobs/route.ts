import { NextResponse } from "next/server"
import { getJobList } from "@/lib/db/queries/jobs"
import { createJob } from "@/lib/db/queries/create-job"
import { recordAuditLog } from "@/lib/db/audit-log"
import { jobCreateSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function GET() {
  try {
    const data = await getJobList()
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("GET /api/jobs failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to fetch jobs" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = jobCreateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid payload" },
        { status: 400 },
      )
    }

    const created = await createJob(parsed.data)

    await recordAuditLog({
      action: "create",
      target_table: "jobs",
      target_id: created.id,
      detail: parsed.data,
    })

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (error) {
    console.error("POST /api/jobs failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to create job" },
      { status: 500 },
    )
  }
}
