import { NextResponse } from "next/server"
import { JOB_STATUSES, type JobStatus } from "@/lib/constants/db-enums"
import { getJobDetail } from "@/lib/db/queries/job-detail"
import { updateJob } from "@/lib/db/queries/update-job"
import { recordAuditLog } from "@/lib/db/audit-log"
import { proposalStatusSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

function getRouteId(params: unknown): string | null {
  if (!params || typeof params !== "object") return null
  const value =
    (params as Record<string, unknown>).id ??
    (params as Record<string, unknown>).jobId

  return typeof value === "string" && value.length > 0 ? value : null
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string; jobId?: string }> },
) {
  const params = await context.params
  const id = getRouteId(params)

  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 })
  }

  const searchParams = new URL(request.url).searchParams
  const proposalStatusParam = searchParams.get("proposal_status")
  let proposalStatus: ReturnType<typeof proposalStatusSchema.parse> | undefined

  if (proposalStatusParam) {
    const parsedStatus = proposalStatusSchema.safeParse(proposalStatusParam)

    if (!parsedStatus.success) {
      return NextResponse.json({ ok: false, error: "invalid proposal_status" }, { status: 400 })
    }

    proposalStatus = parsedStatus.data
  }

  const data = await getJobDetail({
    id,
    proposalStatus,
  })

  if (!data.job) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string; jobId?: string }> },
) {
  try {
    const params = await context.params
    const id = getRouteId(params)

    if (!id) {
      return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 })
    }

    const json = await request.json()

    const internal_title =
      typeof json.internal_title === "string" && json.internal_title.trim().length > 0
        ? json.internal_title
        : undefined

    const status =
      typeof json.status === "string" && JOB_STATUSES.includes(json.status as JobStatus)
        ? (json.status as JobStatus)
        : undefined

    if (!internal_title && !status) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 })
    }

    const updated = await updateJob({
      id,
      internal_title,
      status,
    })

    if (!updated) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
    }

    await recordAuditLog({
      action: "update",
      target_table: "jobs",
      target_id: updated.id,
      detail: { internal_title, status },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (error) {
    console.error("PATCH /api/jobs/[id] failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to update job" },
      { status: 500 },
    )
  }
}
