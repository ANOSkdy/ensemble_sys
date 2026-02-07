import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/lib/db";
import { deleteTodo, todoIdSchema, todoUpdateSchema, updateTodo } from "@/lib/todos";

export const runtime = "nodejs";

function parseId(idParam: string) {
  const parsed = todoIdSchema.safeParse(idParam);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_DATABASE_URL" },
      { status: 503 }
    );
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const body = await _request.json().catch(() => null);
  const parsed = todoUpdateSchema.safeParse(body ?? {});
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const result = await updateTodo(id, parsed.data);
  if ((result?.rowCount ?? 0) === 0) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, todo: result?.todo });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_DATABASE_URL" },
      { status: 503 }
    );
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const deleted = await deleteTodo(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
