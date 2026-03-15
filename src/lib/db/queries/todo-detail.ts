import "server-only"
import { sql } from "@/lib/db/client"

export type TodoDetail = {
  id: string
  org_id: string
  title: string
  status: string | null
  instructions: string | null
  evidence_urls: string[] | null
  due_at: string | null
}

export async function getTodoDetail(id: string): Promise<TodoDetail | null> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      title,
      status,
      instructions,
      evidence_urls,
      due_at::text
    from todos
    where id::text = ${id}
    limit 1
  `

  return (rows[0] as TodoDetail | undefined) ?? null
}
