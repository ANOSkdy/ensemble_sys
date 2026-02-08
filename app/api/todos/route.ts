import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { createTodo, listTodos, todoCreateSchema, todoStatusSchema, todoTypeSchema } from "@/lib/todos";

export const runtime = "nodejs";

const limitSchema = z.coerce.number().int().min(1).max(50).optional();

export async function GET(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_DATABASE_URL" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitResult = limitSchema.safeParse(searchParams.get("limit"));
  const limit = limitResult.success && limitResult.data ? limitResult.data : 50;

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

  const filtersParsed = z
    .object({
      status: todoStatusSchema.optional(),
      type: todoTypeSchema.optional(),
      client: z.string().uuid().optional(),
      due_at: z
        .string()
        .regex(/^\\d{4}-\\d{2}-\\d{2}$/)
        .optional(),
      search: z.string().trim().min(1).max(200).optional()
    })
    .safeParse({
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      client: searchParams.get("client") ?? undefined,
      due_at: searchParams.get("due_at") ?? undefined,
      search: searchParams.get("search") ?? undefined
    });

  try {
    const filters = filtersParsed.success
      ? {
          status: filtersParsed.data.status,
          type: filtersParsed.data.type,
          clientId: filtersParsed.data.client,
          dueAt: filtersParsed.data.due_at,
          search: filtersParsed.data.search
        }
      : {};
    const todos = await listTodos(user.orgId, filters);
    return NextResponse.json({ ok: true, todos: todos.slice(0, limit) });
  } catch {
    return NextResponse.json(
      { ok: false, error: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_DATABASE_URL" },
      { status: 503 }
    );
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

  const body = await request.json().catch(() => null);
  const parsed = todoCreateSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  try {
    const todo = await createTodo(user.orgId, parsed.data);
    return NextResponse.json({ ok: true, todo }, { status: 201 });
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
