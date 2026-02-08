import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
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

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }
  if (user.orgId === null) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ORG" },
      { status: 403 }
    );
  }

  const body = await _request.json().catch(() => null);
  const parsed = todoUpdateSchema.safeParse(body ?? {});
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  try {
    const result = await updateTodo(user.orgId, id, parsed.data);
    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return NextResponse.json(
        { ok: false, error: "MISSING_TODOS_TABLE" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }
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

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }
  if (user.orgId === null) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ORG" },
      { status: 403 }
    );
  }

  try {
    const deleted = await deleteTodo(user.orgId, id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return NextResponse.json(
        { ok: false, error: "MISSING_TODOS_TABLE" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }
}
