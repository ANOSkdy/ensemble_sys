import { NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteTodo, updateTodo } from '../../../../lib/todos';

export const runtime = 'nodejs';

const idSchema = z
  .string()
  .transform((value) => Number(value))
  .pipe(z.number().int().positive());

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  completed: z.boolean().optional(),
});

function parseId(params: { id?: string }) {
  const parsed = idSchema.safeParse(params.id);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id?: string } },
) {
  const id = parseId(params);
  if (!id) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_payload' },
      { status: 400 },
    );
  }

  try {
    const todo = await updateTodo(id, parsed.data);
    if (!todo) {
      return NextResponse.json(
        { ok: false, error: 'not_found_or_no_changes' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, todo });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id?: string } },
) {
  const id = parseId(params);
  if (!id) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    const deleted = await deleteTodo(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}
