import "server-only"
import { sql } from "@/lib/db/client"

export type RunListRow = {
  id: string
  org_id: string
  run_type: string
  channel: string | null
  file_format: string | null
  status: string | null
  executed_at: string | null
  completed_at: string | null
}

export async function getRunList(): Promise<RunListRow[]> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      run_type,
      channel,
      file_format,
      status,
      null::text as executed_at,
      null::text as completed_at
    from runs
    order by id desc
  `
  return rows as RunListRow[]
}
