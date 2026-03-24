import "server-only"
import { type AiProposalStatus } from "@/lib/constants/db-enums"
import { sql } from "@/lib/db/client"
import { getAiProposalsByJobPosting } from "@/lib/db/queries/ai-proposals"

export type JobDetail = {
  id: string
  org_id: string
  client_id: string
  internal_title: string | null
  status: string | null
  memo: string | null
}

export type JobPostingRow = {
  id: string
  channel: string | null
  publish_status_cache: string | null
}

export type JobRevisionRow = {
  id: string
  rev_no: number | null
  source: string | null
  status: string | null
}

export type JobAiProposalRow = {
  id: string
  thinking_level: string | null
  status: AiProposalStatus
  meeting_id: string | null
}

export type JobDetailResult = {
  job: JobDetail | null
  postings: JobPostingRow[]
  revisions: JobRevisionRow[]
  aiProposals: JobAiProposalRow[]
}

export type GetJobDetailInput = {
  id: string
  proposalStatus?: AiProposalStatus
}

export async function getJobDetail(
  input: GetJobDetailInput | string,
): Promise<JobDetailResult> {
  const normalizedInput: GetJobDetailInput =
    typeof input === "string" ? { id: input } : input

  const jobRows = await sql`
    select
      id::text,
      org_id::text,
      client_id::text,
      internal_title,
      status,
      null::text as memo
    from jobs
    where id::text = ${normalizedInput.id}
    limit 1
  `

  const postings = await sql`
    select
      id::text,
      channel,
      publish_status_cache
    from job_postings
    where job_id::text = ${normalizedInput.id}
    order by id desc
  `

  const postingIds = (postings as { id: string }[]).map((posting) => posting.id)

  const revisions = await sql`
    select
      id::text,
      rev_no,
      source,
      status
    from job_revisions
    where job_posting_id in (
      select id from job_postings where job_id::text = ${normalizedInput.id}
    )
    order by id desc
  `

  const aiProposals = await getAiProposalsByJobPosting({
    jobPostingIds: postingIds,
    status: normalizedInput.proposalStatus,
  })

  return {
    job: (jobRows[0] as JobDetail | undefined) ?? null,
    postings: postings as JobPostingRow[],
    revisions: revisions as JobRevisionRow[],
    aiProposals: aiProposals.map((proposal) => ({
      id: proposal.id,
      thinking_level: proposal.thinking_level,
      status: proposal.status,
      meeting_id: proposal.meeting_id,
    })),
  }
}
