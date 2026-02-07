import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createTodo, listTodos } from '../../../lib/todos';

export const runtime = 'nodejs';

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

const limitSchema = z
  .string()
  .transform((value) => Number(value))
  .pipe(z.number().int().min(1).max(100));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? limitSchema.safeParse(limitParam) : null;

  try {
    const todos = await listTodos(limit?.success ? limit.data : 20);
    return NextResponse.json({ ok: true, todos });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_payload' },
      { status: 400 },
    );
  }

  try {
    const todo = await createTodo(parsed.data.title);
    return NextResponse.json({ ok: true, todo }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}
