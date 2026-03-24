import "server-only"
import { createHash } from "node:crypto"
import {
  canTransitionAiProposalStatus,
  isAiProposalStatus,
} from "@/lib/ai-proposals/status-lifecycle"
import {
  JOB_REVISION_SOURCES,
  JOB_REVISION_STATUSES,
  type AiProposalStatus,
  type JobRevisionSource,
  type JobRevisionStatus,
} from "@/lib/constants/db-enums"
import { sql } from "@/lib/db/client"
import {
  getJobPostingCurrentRevision,
  type JobPostingCurrentRevisionRow,
} from "@/lib/db/queries/job-postings-current-revision"

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

export type CreateJobRevisionFromProposalResult = {
  revision: JobRevisionRow
  job_posting: JobPostingCurrentRevisionRow
}

export async function createJobRevisionFromProposal(
  input: CreateJobRevisionFromProposalInput,
): Promise<CreateJobRevisionFromProposalResult> {
  const proposalRows = await sql`
    select
      id::text,
      org_id::text,
      job_posting_id::text,
      output_json,
      status,
      job_revision_id::text as job_revision_id
    from ai_proposals
    where id::text = ${input.proposal_id}
      and org_id::text = ${input.org_id}
    limit 1
  `

  const proposal = proposalRows[0] as
    | {
        id: string
        org_id: string
        job_posting_id: string
        output_json: unknown
        status: string
        job_revision_id: string | null
      }
    | undefined

  if (!proposal) {
    throw new Error("AI proposal not found.")
  }

  if (!isAiProposalStatus(proposal.status)) {
    throw new Error("AI proposal status is invalid.")
  }

  if (!canTransitionAiProposalStatus(proposal.status, "approved")) {
    throw new Error("AI proposal status transition is invalid.")
  }

  if (proposal.job_revision_id) {
    throw new Error("AI proposal already approved.")
  }

  const payloadJsonText = JSON.stringify(proposal.output_json)
  const payloadHash = createHash("sha256").update(payloadJsonText).digest("hex")

  const rows = await sql`
    with next_rev as (
      select coalesce(max(rev_no), 0)::int + 1 as next_rev_no
      from job_revisions
      where job_posting_id::text = ${proposal.job_posting_id}
    ), inserted_revision as (
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
      select
        ${proposal.org_id}::uuid,
        ${proposal.job_posting_id}::uuid,
        next_rev.next_rev_no,
        ${JOB_REVISION_SOURCES[0]},
        ${JOB_REVISION_STATUSES[0]},
        ${payloadJsonText}::jsonb,
        ${payloadHash},
        ${input.created_by}::uuid,
        ${input.approved_by}::uuid,
        now()
      from next_rev
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
    ), linked_proposal as (
      update ai_proposals p
      set
        job_revision_id = inserted_revision.id::uuid,
        status = ${"approved" satisfies AiProposalStatus}
      from inserted_revision
      where p.id::text = ${proposal.id}
        and p.status = ${proposal.status}
      returning p.id
    )
    update job_postings jp
    set
      publish_status_cache = inserted_revision.status,
      updated_at = now()
    from inserted_revision
    where jp.id = inserted_revision.job_posting_id::uuid
      and jp.org_id::text = ${input.org_id}
      and exists (select 1 from linked_proposal)
    returning
      inserted_revision.id,
      inserted_revision.org_id,
      inserted_revision.job_posting_id,
      inserted_revision.rev_no,
      inserted_revision.source,
      inserted_revision.status,
      inserted_revision.payload_json,
      inserted_revision.payload_hash,
      inserted_revision.created_by,
      inserted_revision.approved_by,
      inserted_revision.approved_at,
      inserted_revision.created_at,
      inserted_revision.updated_at
  `

  const created = rows[0] as JobRevisionRow | undefined

  if (!created) {
    throw new Error("AI proposal status transition is invalid.")
  }

  const jobPosting = await getJobPostingCurrentRevision(
    input.org_id,
    created.job_posting_id,
  )

  if (!jobPosting) {
    throw new Error("Job posting not found after approval.")
  }

  return {
    revision: created,
    job_posting: jobPosting,
  }
}
