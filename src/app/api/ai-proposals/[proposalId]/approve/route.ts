import { NextResponse } from "next/server"
import { proposalApiErrorResponse } from "@/lib/api/proposal-api-errors"
import { createJobRevisionFromProposal } from "@/lib/db/queries/create-job-revision-from-proposal"
import { proposalApproveSchema, proposalPathParamSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  try {
    const paramsParsed = proposalPathParamSchema.safeParse(await params)
    if (!paramsParsed.success) {
      return proposalApiErrorResponse({
        status: 422,
        error: "validation_error",
        code: "INVALID_PROPOSAL_ID",
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

    const parsed = proposalApproveSchema.safeParse({
      ...(json && typeof json === "object" ? json : {}),
      proposal_id: paramsParsed.data.proposalId,
    })

    if (!parsed.success) {
      return proposalApiErrorResponse({
        status: 422,
        error: "validation_error",
        code: "INVALID_APPROVAL_PAYLOAD",
        issues: parsed.error.flatten(),
      })
    }

    const approved = await createJobRevisionFromProposal({
      org_id: parsed.data.org_id,
      proposal_id: parsed.data.proposal_id,
      created_by: parsed.data.approved_by,
      approved_by: parsed.data.approved_by,
    })

    return NextResponse.json(
      {
        ok: true,
        data: approved.revision,
        job_posting: approved.job_posting,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST /api/ai-proposals/[proposalId]/approve failed", error)

    if (
      error instanceof Error &&
      (error.message === "AI proposal already approved." ||
        error.message === "AI proposal status transition is invalid.")
    ) {
      return proposalApiErrorResponse({
        status: 409,
        error: "conflict",
        code: "INVALID_PROPOSAL_STATUS_TRANSITION",
      })
    }

    if (error instanceof Error && error.message === "AI proposal not found.") {
      return proposalApiErrorResponse({
        status: 404,
        error: "not_found",
        code: "PROPOSAL_NOT_FOUND",
      })
    }

    return proposalApiErrorResponse({
      status: 500,
      error: "internal_server_error",
      code: "PROPOSAL_APPROVE_FAILED",
    })
  }
}
