import { NextResponse } from "next/server"
import { proposalApiErrorResponse } from "@/lib/api/proposal-api-errors"
import { getAiProposalDetail } from "@/lib/db/queries/get-ai-proposal-detail"
import {
  proposalDetailQuerySchema,
  proposalPathParamSchema,
} from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function GET(
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

    const searchParams = new URL(request.url).searchParams
    const queryParsed = proposalDetailQuerySchema.safeParse({
      org_id: searchParams.get("org_id"),
      status: searchParams.get("status") ?? undefined,
    })

    if (!queryParsed.success) {
      return proposalApiErrorResponse({
        status: 422,
        error: "validation_error",
        code: "INVALID_QUERY",
        issues: queryParsed.error.flatten(),
      })
    }

    const data = await getAiProposalDetail({
      id: paramsParsed.data.proposalId,
      org_id: queryParsed.data.org_id,
      status: queryParsed.data.status,
    })

    if (!data) {
      return proposalApiErrorResponse({
        status: 404,
        error: "not_found",
        code: "PROPOSAL_NOT_FOUND",
      })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("GET /api/ai-proposals/[proposalId] failed", error)
    return proposalApiErrorResponse({
      status: 500,
      error: "internal_server_error",
      code: "PROPOSAL_READ_FAILED",
    })
  }
}
