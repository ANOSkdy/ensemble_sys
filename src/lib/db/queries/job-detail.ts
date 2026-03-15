import "server-only"
import { sql } from "@/lib/db/client"

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
  status: string | null
  meeting_id: string | null
}

export type JobDetailResult = {
  job: JobDetail | null
  postings: JobPostingRow[]
  revisions: JobRevisionRow[]
  aiProposals: JobAiProposalRow[]
}

export async function getJobDetail(id: string): Promise<JobDetailResult> {
  const jobRows = await sql`
    select
      id::text,
      org_id::text,
      client_id::text,
      internal_title,
      status,
      null::text as memo
    from jobs
    where id::text = ${id}
    limit 1
  `

  const postings = await sql`
    select
      id::text,
      channel,
      publish_status_cache
    from job_postings
    where job_id::text = ${id}
    order by id desc
  `

  const revisions = await sql`
    select
      id::text,
      rev_no,
      source,
      status
    from job_revisions
    where job_posting_id in (
      select id from job_postings where job_id::text = ${id}
    )
    order by id desc
  `

  const aiProposals = await sql`
    select
      id::text,
      thinking_level,
      null::text as status,
      meeting_id::text
    from ai_proposals
    where job_posting_id in (
      select id from job_postings where job_id::text = ${id}
    )
    order by id desc
  `

  return {
    job: (jobRows[0] as JobDetail | undefined) ?? null,
    postings: postings as JobPostingRow[],
    revisions: revisions as JobRevisionRow[],
    aiProposals: aiProposals as JobAiProposalRow[],
  }
}
