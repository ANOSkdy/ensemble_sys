import "server-only"
import { sql } from "@/lib/db/client"

export type UpdateTodoInput = {
  id: string
  status?: string
  title?: string
  instructions?: string | null
  due_at?: string | null
}

export async function updateTodo(input: UpdateTodoInput) {
  const rows = await sql`
    update todos
    set
      status = coalesce(${input.status ?? null}, status),
      title = coalesce(${input.title ?? null}, title),
      instructions = coalesce(${input.instructions ?? null}, instructions),
      due_at = coalesce(${input.due_at ?? null}::timestamptz, due_at),
      updated_at = now()
    where id::text = ${input.id}
    returning id::text
  `
  return (rows[0] as { id: string } | undefined) ?? null
}
