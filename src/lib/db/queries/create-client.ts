import "server-only"
import { sql } from "@/lib/db/client"

export type CreateClientInput = {
  org_id: string
  name: string
  industry?: string | null
  owner_name?: string | null
  notes?: string | null
  timezone?: string | null
}

export async function createClient(input: CreateClientInput) {
  const rows = await sql`
    insert into clients (
      org_id,
      name,
      industry,
      owner_name,
      notes,
      timezone
    )
    values (
      ${input.org_id}::uuid,
      ${input.name},
      ${input.industry ?? null},
      ${input.owner_name ?? null},
      ${input.notes ?? null},
      ${input.timezone ?? null}
    )
    returning id::text
  `
  return rows[0] as { id: string }
}
