import "server-only"
import { type AiProposalStatus } from "@/lib/constants/db-enums"
import { sql } from "@/lib/db/client"

export type AiProposalListRow = {
  id: string
  job_posting_id: string
  meeting_id: string | null
  thinking_level: string | null
  status: AiProposalStatus
  created_at: string
}

export type GetAiProposalsByJobPostingInput = {
  jobPostingIds: string[]
  status?: AiProposalStatus
}

export async function getAiProposalsByJobPosting(
  input: GetAiProposalsByJobPostingInput,
): Promise<AiProposalListRow[]> {
  if (input.jobPostingIds.length === 0) {
    return []
  }

  const rows = await sql`
    select
      id::text,
      job_posting_id::text,
      meeting_id::text,
      thinking_level,
      status,
      created_at::text
    from ai_proposals
    where job_posting_id = any(${input.jobPostingIds}::uuid[])
      and (${input.status ?? null}::text is null or status = ${input.status ?? null}::text)
    order by created_at desc, id desc
  `

  return rows as AiProposalListRow[]
}
