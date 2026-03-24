import { NextResponse } from "next/server"
import { proposalApiErrorResponse } from "@/lib/api/proposal-api-errors"
import { sql } from "@/lib/db/client"
import { createManualPublishRun } from "@/lib/db/queries/create-manual-publish-run"
import { queuePublishRunSchema, revisionPathParamSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  try {
    const paramsParsed = revisionPathParamSchema.safeParse(await params)
    if (!paramsParsed.success) {
      return proposalApiErrorResponse({
        status: 422,
        error: "validation_error",
        code: "INVALID_REVISION_ID",
        issues: paramsParsed.error.flatten(),
      })
    }

    let json: unknown
    try {
      json = await request.json()
    } catch {
      return proposalApiErrorResponse({
        status: 422,
        error: "validation_error",
        code: "INVALID_JSON_BODY",
      })
    }

    const parsed = queuePublishRunSchema.safeParse({
      ...(json && typeof json === "object" ? json : {}),
      job_revision_id: paramsParsed.data.revisionId,
    })

    if (!parsed.success) {
      return proposalApiErrorResponse({
        status: 422,
        error: "validation_error",
        code: "INVALID_QUEUE_PAYLOAD",
        issues: parsed.error.flatten(),
      })
    }

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
      where jr.id::text = ${parsed.data.job_revision_id}
        and jr.org_id::text = ${parsed.data.org_id}
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
      return proposalApiErrorResponse({
        status: 404,
        error: "not_found",
        code: "REVISION_NOT_FOUND",
      })
    }

    const created = await createManualPublishRun({
      ...parsed.data,
      org_id: revision.org_id,
      client_id: revision.client_id,
      job_posting_id: revision.job_posting_id,
      job_revision_id: revision.id,
    })

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (error) {
    console.error("POST /api/job-revisions/[revisionId]/queue-publish failed", error)
    return proposalApiErrorResponse({
      status: 500,
      error: "internal_server_error",
      code: "QUEUE_PUBLISH_FAILED",
    })
  }
}
