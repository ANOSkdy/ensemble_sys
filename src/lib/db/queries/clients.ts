import "server-only"
import { sql } from "@/lib/db/client"

export type ClientListRow = {
  id: string
  org_id: string
  name: string
  owner_name: string | null
  memo: string | null
}

export async function getClientList(): Promise<ClientListRow[]> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      name,
      owner_name,
      null::text as memo
    from clients
    order by name asc
  `
  return rows as ClientListRow[]
}
