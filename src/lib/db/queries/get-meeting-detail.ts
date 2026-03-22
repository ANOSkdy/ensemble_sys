import "server-only"
import { sql } from "@/lib/db/client"

export type MeetingDetail = {
  id: string
  org_id: string
  client_id: string
  held_at: string
  memo: string
  created_by: string
  created_at: string
  updated_at: string
}

export async function getMeetingDetail(id: string): Promise<MeetingDetail | null> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      client_id::text,
      held_at::text,
      memo,
      created_by::text,
      created_at::text,
      updated_at::text
    from client_meetings
    where id::text = ${id}
    limit 1
  `

  return (rows[0] as MeetingDetail | undefined) ?? null
}