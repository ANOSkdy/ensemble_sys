import "server-only"
import { sql } from "@/lib/db/client"

export type CreateAiProposalInput = {
  org_id: string
  job_posting_id: string
  meeting_id: string
  input_prompt: string
  model: string
  thinking_level: string
  output_json: unknown
}

export type AiProposalRow = {
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

export async function createAiProposal(
  input: CreateAiProposalInput,
): Promise<AiProposalRow> {
  const rows = await sql`
    insert into ai_proposals (
      org_id,
      job_posting_id,
      meeting_id,
      input_prompt,
      model,
      thinking_level,
      output_json
    )
    values (
      ${input.org_id}::uuid,
      ${input.job_posting_id}::uuid,
      ${input.meeting_id}::uuid,
      ${input.input_prompt},
      ${input.model},
      ${input.thinking_level},
      ${JSON.stringify(input.output_json)}::jsonb
    )
    returning
      id::text,
      org_id::text,
      job_posting_id::text,
      meeting_id::text,
      input_prompt,
      model,
      thinking_level,
      output_json,
      created_at::text
  `

  return rows[0] as AiProposalRow
}