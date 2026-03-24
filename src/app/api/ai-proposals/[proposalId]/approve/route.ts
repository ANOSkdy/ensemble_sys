import { NextResponse } from "next/server"
import { createJobRevisionFromProposal } from "@/lib/db/queries/create-job-revision-from-proposal"
import { proposalApproveSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  try {
    const { proposalId } = await params
    const json = await request.json()

    const parsed = proposalApproveSchema.safeParse({
      ...json,
      proposal_id: proposalId,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      )
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
      return NextResponse.json({ ok: false, error: "invalid proposal status transition" }, { status: 409 })
    }

    if (error instanceof Error && error.message === "AI proposal not found.") {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
    }

    return NextResponse.json(
      { ok: false, error: "failed to approve proposal" },
      { status: 500 },
    )
  }
}
