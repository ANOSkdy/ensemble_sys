import "server-only"
import { sql } from "@/lib/db/client"

export type CreateJobInput = {
  org_id: string
  client_id: string
  internal_title: string
  status: "active" | "archived"
}

export async function createJob(input: CreateJobInput) {
  const rows = await sql`
    insert into jobs (
      org_id,
      client_id,
      internal_title,
      status
    )
    values (
      ${input.org_id}::uuid,
      ${input.client_id}::uuid,
      ${input.internal_title},
      ${input.status}
    )
    returning id::text
  `
  return rows[0] as { id: string }
}
