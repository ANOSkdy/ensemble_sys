import "server-only"
import { sql } from "@/lib/db/client"

export type JobPostingCurrentRevisionRow = {
  id: string
  org_id: string
  publish_status_cache: string | null
  current_revision_id: string | null
  current_revision_rev_no: number | null
  current_revision_status: string | null
}

export async function getJobPostingCurrentRevision(
  orgId: string,
  jobPostingId: string,
): Promise<JobPostingCurrentRevisionRow | null> {
  const rows = await sql`
    select
      jp.id::text,
      jp.org_id::text,
      jp.publish_status_cache,
      current_revision.id::text as current_revision_id,
      current_revision.rev_no as current_revision_rev_no,
      current_revision.status as current_revision_status
    from job_postings jp
    left join lateral (
      select jr.id, jr.rev_no, jr.status
      from job_revisions jr
      where jr.job_posting_id = jp.id
      order by jr.rev_no desc, jr.created_at desc
      limit 1
    ) current_revision on true
    where jp.org_id::text = ${orgId}
      and jp.id::text = ${jobPostingId}
    limit 1
  `

  return (rows[0] as JobPostingCurrentRevisionRow | undefined) ?? null
}
