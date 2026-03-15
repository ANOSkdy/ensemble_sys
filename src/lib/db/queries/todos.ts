import "server-only"
import { sql } from "@/lib/db/client"

export type TodoListRow = {
  id: string
  org_id: string
  title: string
  status: string | null
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
}

export async function getTodoList(): Promise<TodoListRow[]> {
  const rows = await sql`
    select
      id::text,
      org_id::text,
      title,
      status,
      null::text as assigned_to,
      due_at::text as due_date,
      null::text as completed_at
    from todos
    order by coalesce(due_at, created_at) desc nulls last, id desc
  `
  return rows as TodoListRow[]
}
