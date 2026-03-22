import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createManualPublishRun } from "@/lib/db/queries/create-manual-publish-run"
import { queuePublishRunSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  try {
    const { revisionId } = await params
    const json = await request.json()

    const revisionRows = await sql`
      select
        jr.id::text,
        jr.org_id::text,
        jr.job_posting_id::text,
        jp.job_id::text,
        j.client_id::text
      from job_revisions jr
      inner join job_postings jp on jp.id = jr.job_posting_id
      inner join jobs j on j.id = jp.job_id
      where jr.id::text = ${revisionId}
      limit 1
    `

    const revision = revisionRows[0] as
      | {
          id: string
          org_id: string
          job_posting_id: string
          job_id: string
          client_id: string
        }
      | undefined

    if (!revision) {
      return NextResponse.json(
        { ok: false, error: "revision not found" },
        { status: 404 },
      )
    }

    const parsed = queuePublishRunSchema.safeParse({
      ...json,
      org_id: revision.org_id,
      client_id: revision.client_id,
      job_posting_id: revision.job_posting_id,
      job_revision_id: revision.id,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const created = await createManualPublishRun(parsed.data)

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (error) {
    console.error("POST /api/job-revisions/[revisionId]/queue-publish failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to queue publish run" },
      { status: 500 },
    )
  }
}