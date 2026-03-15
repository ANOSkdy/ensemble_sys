import "server-only"
import { sql } from "@/lib/db/client"

export type RunDetail = {
  id: string
  org_id: string
  run_type: string
  channel: string | null
  file_format: string | null
  file_sha256: string | null
  status: string | null
}

export type RunItemRow = {
  id: string
  job_posting_id: string | null
  result_status: string | null
  updated_at: string | null
}

export type RunDetailResult = {
  run: RunDetail | null
  items: RunItemRow[]
}

export async function getRunDetail(id: string): Promise<RunDetailResult> {
  const runRows = await sql`
    select
      id::text,
      org_id::text,
      run_type,
      channel,
      file_format,
      file_sha256,
      status
    from runs
    where id::text = ${id}
    limit 1
  `

  const items = await sql`
    select
      id::text,
      job_posting_id::text,
      action as result_status,
      created_at::text as updated_at
    from run_items
    where run_id::text = ${id}
    order by id desc
  `

  return {
    run: (runRows[0] as RunDetail | undefined) ?? null,
    items: items as RunItemRow[],
  }
}
