import { NextResponse } from "next/server"
import { getTodoDetail } from "@/lib/db/queries/todo-detail"
import { updateTodo } from "@/lib/db/queries/update-todo"
import { recordAuditLog } from "@/lib/db/audit-log"

export const runtime = "nodejs"

function getRouteId(params: unknown): string | null {
  if (!params || typeof params !== "object") return null
  const value =
    (params as Record<string, unknown>).id ??
    (params as Record<string, unknown>).todoId

  return typeof value === "string" && value.length > 0 ? value : null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string; todoId?: string }> },
) {
  const params = await context.params
  const id = getRouteId(params)

  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 })
  }

  const data = await getTodoDetail(id)

  if (!data) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string; todoId?: string }> },
) {
  try {
    const params = await context.params
    const id = getRouteId(params)

    if (!id) {
      return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 })
    }

    const json = await request.json()

    const payload = {
      id,
      status: typeof json.status === "string" && json.status.trim() ? json.status : undefined,
      title: typeof json.title === "string" && json.title.trim() ? json.title : undefined,
      instructions:
        typeof json.instructions === "string" ? json.instructions : json.instructions === null ? null : undefined,
      due_at:
        typeof json.due_at === "string" && json.due_at.trim() ? json.due_at : json.due_at === null ? null : undefined,
    }

    if (!payload.status && !payload.title && payload.instructions === undefined && payload.due_at === undefined) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 })
    }

    const updated = await updateTodo(payload)

    if (!updated) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
    }

    await recordAuditLog({
      action: "update",
      target_table: "todos",
      target_id: updated.id,
      detail: payload,
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (error) {
    console.error("PATCH /api/todos/[id] failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to update todo" },
      { status: 500 },
    )
  }
}
