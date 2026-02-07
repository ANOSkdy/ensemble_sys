import 'server-only';

import { query } from './db';

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

export async function listTodos(limit = 20): Promise<Todo[]> {
  const result = await query<{
    id: number;
    title: string;
    completed: boolean;
    created_at: string;
  }>(
    'SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC LIMIT $1',
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.created_at,
  }));
}

export async function createTodo(title: string): Promise<Todo> {
  const result = await query<{
    id: number;
    title: string;
    completed: boolean;
    created_at: string;
  }>(
    'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at',
    [title],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

export async function updateTodo(
  id: number,
  updates: { title?: string; completed?: boolean },
): Promise<Todo | null> {
  const fields: string[] = [];
  const values: Array<string | boolean | number> = [];

  if (updates.title !== undefined) {
    fields.push(`title = $${values.length + 1}`);
    values.push(updates.title);
  }

  if (updates.completed !== undefined) {
    fields.push(`completed = $${values.length + 1}`);
    values.push(updates.completed);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);

  const result = await query<{
    id: number;
    title: string;
    completed: boolean;
    created_at: string;
  }>(
    `UPDATE todos SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, title, completed, created_at`,
    values,
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

export async function deleteTodo(id: number): Promise<boolean> {
  const result = await query('DELETE FROM todos WHERE id = $1', [id]);
  return result.rowCount > 0;
}
