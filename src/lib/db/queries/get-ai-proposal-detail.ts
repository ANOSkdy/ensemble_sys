import "server-only"
import { type AiProposalStatus } from "@/lib/constants/db-enums"
import { sql } from "@/lib/db/client"

export type AiProposalDetail = {
  id: string
  org_id: string
  job_posting_id: string
  meeting_id: string
  input_prompt: string
  model: string
  thinking_level: string
  status: AiProposalStatus
  output_json: unknown
  created_at: string
}

export type GetAiProposalDetailInput = {
  id: string
  org_id?: string
  status?: AiProposalStatus
}

export async function getAiProposalDetail(
  input: GetAiProposalDetailInput,
): Promise<AiProposalDetail | null> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      job_posting_id::text,
      meeting_id::text,
      input_prompt,
      model,
      thinking_level,
      status,
      output_json,
      created_at::text
    from ai_proposals
    where id::text = ${input.id}
      and (${input.org_id ?? null}::text is null or org_id::text = ${input.org_id ?? null}::text)
      and (${input.status ?? null}::text is null or status = ${input.status ?? null}::text)
    limit 1
  `

  return (rows[0] as AiProposalDetail | undefined) ?? null
}
