import "server-only"
import { sql } from "@/lib/db/client"

export type JobListRow = {
  id: string
  org_id: string
  client_id: string
  internal_title: string | null
  status: string | null
  memo: string | null
}

export async function getJobList(): Promise<JobListRow[]> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      client_id::text,
      internal_title,
      status,
      null::text as memo
    from jobs
    order by id desc
  `
  return rows as JobListRow[]
}
