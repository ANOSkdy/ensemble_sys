import { NextResponse } from "next/server"
import { getAiProposalDetail } from "@/lib/db/queries/get-ai-proposal-detail"
import { proposalStatusSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  try {
    const { proposalId } = await params
    const searchParams = new URL(request.url).searchParams

    const statusParam = searchParams.get("status")

    let status: ReturnType<typeof proposalStatusSchema.parse> | undefined

    if (statusParam) {
      const statusParsed = proposalStatusSchema.safeParse(statusParam)

      if (!statusParsed.success) {
        return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 })
      }

      status = statusParsed.data
    }

    const data = await getAiProposalDetail({
      id: proposalId,
      status,
    })

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
