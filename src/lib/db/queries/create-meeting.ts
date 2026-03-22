import "server-only"
import { sql } from "@/lib/db/client"

export type CreateMeetingInput = {
  org_id: string
  client_id: string
  held_at: string
  memo: string
  created_by: string
}

export type MeetingRow = {
  id: string
  org_id: string
  client_id: string
  held_at: string
  memo: string
  created_by: string
  created_at: string
  updated_at: string
}

export async function createMeeting(input: CreateMeetingInput): Promise<MeetingRow> {
  const rows = await sql`
    insert into client_meetings (
      org_id,
      client_id,
      held_at,
      memo,
      created_by
    )
    values (
      ${input.org_id}::uuid,
      ${input.client_id}::uuid,
      ${input.held_at}::timestamptz,
      ${input.memo},
      ${input.created_by}::uuid
    )
    returning
      id::text,
      org_id::text,
      client_id::text,
      held_at::text,
      memo,
      created_by::text,
      created_at::text,
      updated_at::text
  `

  return rows[0] as MeetingRow
}