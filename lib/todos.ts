import { z } from "zod";
import { query } from "@/lib/db";

export const todoInputSchema = z.object({
  title: z.string().trim().min(1).max(200)
});

export const todoUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional()
});

export const todoIdSchema = z.coerce.number().int().positive();

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

export async function listTodos(limit: number): Promise<Todo[]> {
  const result = await query<{
    id: number;
    title: string;
    completed: boolean;
    created_at: string;
  }>(
    "SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC LIMIT $1",
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.created_at
  }));
}

export async function createTodo(title: string): Promise<Todo> {
  const result = await query<{
    id: number;
    title: string;
    completed: boolean;
    created_at: string;
  }>(
    "INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at",
    [title]
  );

  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    completed: result.rows[0].completed,
    createdAt: result.rows[0].created_at
  };
}

export async function updateTodo(
  id: number,
  updates: { title?: string; completed?: boolean }
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(updates.title);
  }

  if (updates.completed !== undefined) {
    fields.push(`completed = $${index++}`);
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
    `UPDATE todos SET ${fields.join(", ")} WHERE id = $${index} RETURNING id, title, completed, created_at`,
    values
  );

  return {
    rowCount: result.rowCount ?? 0,
    todo: result.rows[0] ?? null
  };
}

export async function deleteTodo(id: number): Promise<boolean> {
  const result = await query("DELETE FROM todos WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
