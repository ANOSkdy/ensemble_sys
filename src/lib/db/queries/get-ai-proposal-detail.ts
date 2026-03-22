import "server-only"
import { sql } from "@/lib/db/client"

export type AiProposalDetail = {
  id: string
  org_id: string
  job_posting_id: string
  meeting_id: string
  input_prompt: string
  model: string
  thinking_level: string
  output_json: unknown
  created_at: string
}

export async function getAiProposalDetail(id: string): Promise<AiProposalDetail | null> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      job_posting_id::text,
      meeting_id::text,
      input_prompt,
      model,
      thinking_level,
      output_json,
      created_at::text
    from ai_proposals
    where id::text = ${id}
    limit 1
  `

  return (rows[0] as AiProposalDetail | undefined) ?? null
}