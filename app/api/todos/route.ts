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

  const todos = await listTodos(limit);
  return NextResponse.json({ ok: true, todos });
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

  const todo = await createTodo(parsed.data.title);
  return NextResponse.json({ ok: true, todo }, { status: 201 });
}
