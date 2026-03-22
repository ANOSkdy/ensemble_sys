import { NextResponse } from "next/server"
import { getAiProposalDetail } from "@/lib/db/queries/get-ai-proposal-detail"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  try {
    const { proposalId } = await params
    const data = await getAiProposalDetail(proposalId)

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "proposal not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("GET /api/ai-proposals/[proposalId] failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to fetch proposal" },
      { status: 500 },
    )
  }
}