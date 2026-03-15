import "server-only"
import { sql } from "@/lib/db/client"

export type UpdateJobInput = {
  id: string
  internal_title?: string
  status?: "active" | "archived"
}

export async function updateJob(input: UpdateJobInput) {
  const rows = await sql`
    update jobs
    set
      internal_title = coalesce(${input.internal_title ?? null}, internal_title),
      status = coalesce(${input.status ?? null}, status),
      updated_at = now()
    where id::text = ${input.id}
    returning id::text
  `
  return (rows[0] as { id: string } | undefined) ?? null
}
