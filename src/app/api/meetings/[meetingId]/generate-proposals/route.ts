import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { generateProposalFromMeeting } from "@/lib/ai/gemini/proposal-generator"
import { createAiProposal } from "@/lib/db/queries/create-ai-proposal"
import { getMeetingDetail } from "@/lib/db/queries/get-meeting-detail"
import { proposalGenerateSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const { meetingId } = await params
    const json = await request.json()

    const parsed = proposalGenerateSchema.safeParse({
      ...json,
      meeting_id: meetingId,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const meeting = await getMeetingDetail(parsed.data.meeting_id)

    if (!meeting) {
      return NextResponse.json(
        { ok: false, error: "meeting not found" },
        { status: 404 },
      )
    }

    const postingRows = await sql`
      select
        jp.id::text,
        jp.job_id::text,
        j.internal_title
      from job_postings jp
      inner join jobs j on j.id = jp.job_id
      where jp.id::text = ${parsed.data.job_posting_id}
      limit 1
    `

    const posting = postingRows[0] as
      | {
          id: string
          job_id: string
          internal_title: string | null
        }
      | undefined

    if (!posting) {
      return NextResponse.json(
        { ok: false, error: "job posting not found" },
        { status: 404 },
      )
    }

    const outputJson = await generateProposalFromMeeting({
      meetingMemo: meeting.memo,
      jobTitle: posting.internal_title ?? "求人タイトル未設定",
      model: parsed.data.model,
    })

    const prompt = [
      "Generate hiring proposal from meeting memo.",
      `Meeting ID: ${meeting.id}`,
      `Job Posting ID: ${posting.id}`,
      `Job Title: ${posting.internal_title ?? ""}`,
    ].join("\n")

    const created = await createAiProposal({
      org_id: parsed.data.org_id,
      meeting_id: parsed.data.meeting_id,
      job_posting_id: parsed.data.job_posting_id,
      input_prompt: prompt,
      model: parsed.data.model,
      thinking_level: parsed.data.thinking_level,
      output_json: outputJson,
    })

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (error) {
    console.error("POST /api/meetings/[meetingId]/generate-proposals failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to generate proposal" },
      { status: 500 },
    )
  }
}