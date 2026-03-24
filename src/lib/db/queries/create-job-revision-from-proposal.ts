import "server-only"
import { createHash } from "node:crypto"
import {
  JOB_REVISION_SOURCES,
  JOB_REVISION_STATUSES,
  type JobRevisionSource,
  type JobRevisionStatus,
} from "@/lib/constants/db-enums"
import { sql } from "@/lib/db/client"
import { getAiProposalDetail } from "@/lib/db/queries/get-ai-proposal-detail"

export type CreateJobRevisionFromProposalInput = {
  org_id: string
  proposal_id: string
  created_by: string
  approved_by: string
}

export type JobRevisionRow = {
  id: string
  org_id: string
  job_posting_id: string
  rev_no: number
  source: JobRevisionSource
  status: JobRevisionStatus
  payload_json: unknown
  payload_hash: string
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export async function createJobRevisionFromProposal(
  input: CreateJobRevisionFromProposalInput,
): Promise<JobRevisionRow> {
  const proposal = await getAiProposalDetail(input.proposal_id)

  if (!proposal) {
    throw new Error("AI proposal not found.")
  }

  const revNoRows = await sql`
    select coalesce(max(rev_no), 0)::int + 1 as next_rev_no
    from job_revisions
    where job_posting_id::text = ${proposal.job_posting_id}
  `

  const nextRevNo = Number(
    (revNoRows[0] as { next_rev_no: number }).next_rev_no ?? 1,
  )

  const payloadJsonText = JSON.stringify(proposal.output_json)
  const payloadHash = createHash("sha256").update(payloadJsonText).digest("hex")

  const rows = await sql`
    insert into job_revisions (
      org_id,
      job_posting_id,
      rev_no,
      source,
      status,
      payload_json,
      payload_hash,
      created_by,
      approved_by,
      approved_at
    )
    values (
      ${input.org_id}::uuid,
      ${proposal.job_posting_id}::uuid,
      ${nextRevNo},
      ${JOB_REVISION_SOURCES[0]},
      ${JOB_REVISION_STATUSES[0]},
      ${payloadJsonText}::jsonb,
      ${payloadHash},
      ${input.created_by}::uuid,
      ${input.approved_by}::uuid,
      now()
    )
    returning
      id::text,
      org_id::text,
      job_posting_id::text,
      rev_no,
      source,
      status,
      payload_json,
      payload_hash,
      created_by::text,
      approved_by::text,
      approved_at::text,
      created_at::text,
      updated_at::text
  `

  const created = rows[0] as JobRevisionRow

  await sql`
    update job_postings
    set
      updated_at = now()
    where id::text = ${created.job_posting_id}
  `

  return created
}