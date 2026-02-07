import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { createTodo, listTodos, todoInputSchema } from "@/lib/todos";

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
  const limit = limitResult.success && limitResult.data ? limitResult.data : 20;

  try {
    const todos = await listTodos(limit);
    return NextResponse.json({ ok: true, todos });
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

  const body = await request.json().catch(() => null);
  const parsed = todoInputSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  try {
    const todo = await createTodo(parsed.data.title);
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
