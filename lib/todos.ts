import { z } from "zod";
import { query } from "@/lib/db";

export const TODO_STATUSES = [
  "open",
  "in_progress",
  "done",
  "blocked",
  "canceled"
] as const;

export const TODO_TYPES = [
  "airwork_upload_file",
  "download_sync",
  "link_new_job_offer_id"
] as const;

export const todoStatusSchema = z.enum(TODO_STATUSES);
export const todoTypeSchema = z.enum(TODO_TYPES);

const todoTitleSchema = z.string().trim().min(1).max(200);
const todoInstructionsSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().max(10000).nullable()
);

const todoDateSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
);

const evidenceUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "URL must start with http:// or https://"
  );

export const todoEvidenceUrlsSchema = z
  .array(evidenceUrlSchema)
  .max(10)
  .default([]);

export const todoIdSchema = z.string().uuid();

export const todoCreateSchema = z.object({
  title: todoTitleSchema,
  type: todoTypeSchema,
  status: todoStatusSchema.optional(),
  instructions: todoInstructionsSchema.optional(),
  dueAt: todoDateSchema.optional(),
  clientId: z.string().uuid().nullable().optional(),
  runId: z.coerce.number().int().positive().nullable().optional(),
  jobId: z.string().uuid().nullable().optional(),
  evidenceUrls: todoEvidenceUrlsSchema.optional()
});

export const todoUpdateSchema = z.object({
  title: todoTitleSchema.optional(),
  instructions: todoInstructionsSchema.optional(),
  dueAt: todoDateSchema.optional(),
  evidenceUrls: todoEvidenceUrlsSchema.optional()
});

export type TodoStatus = z.infer<typeof todoStatusSchema>;
export type TodoType = z.infer<typeof todoTypeSchema>;
export type TodoCreateInput = z.infer<typeof todoCreateSchema>;
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>;

export type TodoListItem = {
  id: string;
  status: TodoStatus;
  type: TodoType;
  title: string;
  dueAt: string | null;
  updatedAt: string | null;
  clientId: string | null;
  clientName: string | null;
  runId: number | null;
  jobId: string | null;
  jobTitle: string | null;
};

export type TodoDetail = TodoListItem & {
  instructions: string | null;
  evidenceUrls: string[];
  createdAt: string;
};

export type TodoFilters = {
  status?: TodoStatus;
  type?: TodoType;
  clientId?: string;
  runId?: number;
  dueAt?: string;
  search?: string;
};

export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function listTodos(
  orgId: string,
  filters: TodoFilters = {}
): Promise<TodoListItem[]> {
  const conditions: string[] = ["todos.org_id = $1"];
  const params: unknown[] = [orgId];
  let index = params.length + 1;

  if (filters.status) {
    conditions.push(`todos.status = $${index++}`);
    params.push(filters.status);
  }

  if (filters.type) {
    conditions.push(`todos.type = $${index++}`);
    params.push(filters.type);
  }

  if (filters.clientId) {
    conditions.push(`todos.client_id = $${index++}`);
    params.push(filters.clientId);
  }

  if (filters.runId) {
    conditions.push(`todos.run_id = $${index++}`);
    params.push(filters.runId);
  }

  if (filters.dueAt) {
    conditions.push(`DATE(todos.due_at) = $${index++}`);
    params.push(filters.dueAt);
  }

  if (filters.search) {
    conditions.push(`todos.title ILIKE $${index++}`);
    params.push(`%${filters.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query<{
      id: string;
      status: TodoStatus;
      type: TodoType;
      title: string;
      due_at: string | null;
      updated_at: string | null;
      client_id: string | null;
      client_name: string | null;
      run_id: number | null;
      job_id: string | null;
      job_title: string | null;
    }>(
      `SELECT todos.id,
              todos.status,
              todos.type,
              todos.title,
              todos.due_at,
              COALESCE(todos.updated_at, todos.created_at) AS updated_at,
              todos.client_id,
              clients.name AS client_name,
              todos.run_id,
              todos.job_id,
              jobs.internal_title AS job_title
       FROM todos
       LEFT JOIN clients
         ON clients.id = todos.client_id AND clients.org_id = todos.org_id
       LEFT JOIN jobs
         ON jobs.id = todos.job_id AND jobs.org_id = todos.org_id
       ${whereClause}
       ORDER BY COALESCE(todos.updated_at, todos.created_at) DESC`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      type: row.type,
      title: row.title,
      dueAt: row.due_at,
      updatedAt: row.updated_at,
      clientId: row.client_id,
      clientName: row.client_name,
      runId: row.run_id,
      jobId: row.job_id,
      jobTitle: row.job_title
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getTodo(
  orgId: string,
  todoId: string
): Promise<TodoDetail | null> {
  try {
    const result = await query<{
      id: string;
      status: TodoStatus;
      type: TodoType;
      title: string;
      instructions: string | null;
      evidence_urls: string[] | null;
      due_at: string | null;
      updated_at: string | null;
      created_at: string;
      client_id: string | null;
      client_name: string | null;
      run_id: number | null;
      job_id: string | null;
      job_title: string | null;
    }>(
      `SELECT todos.id,
              todos.status,
              todos.type,
              todos.title,
              todos.instructions,
              todos.evidence_urls,
              todos.due_at,
              todos.updated_at,
              todos.created_at,
              todos.client_id,
              clients.name AS client_name,
              todos.run_id,
              todos.job_id,
              jobs.internal_title AS job_title
       FROM todos
       LEFT JOIN clients
         ON clients.id = todos.client_id AND clients.org_id = todos.org_id
       LEFT JOIN jobs
         ON jobs.id = todos.job_id AND jobs.org_id = todos.org_id
       WHERE todos.org_id = $1 AND todos.id = $2
       LIMIT 1`,
      [orgId, todoId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      status: row.status,
      type: row.type,
      title: row.title,
      instructions: row.instructions,
      evidenceUrls: row.evidence_urls ?? [],
      dueAt: row.due_at,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      clientId: row.client_id,
      clientName: row.client_name,
      runId: row.run_id,
      jobId: row.job_id,
      jobTitle: row.job_title
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createTodo(
  orgId: string,
  data: TodoCreateInput
): Promise<TodoDetail> {
  const evidenceUrls = data.evidenceUrls ?? [];
  const status = data.status ?? "open";

  try {
    const result = await query<{
      id: string;
      status: TodoStatus;
      type: TodoType;
      title: string;
      instructions: string | null;
      evidence_urls: string[] | null;
      due_at: string | null;
      updated_at: string | null;
      created_at: string;
      client_id: string | null;
      run_id: number | null;
      job_id: string | null;
    }>(
      `INSERT INTO todos (
         org_id,
         status,
         type,
         title,
         instructions,
         evidence_urls,
         due_at,
         client_id,
         run_id,
         job_id,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id,
                 status,
                 type,
                 title,
                 instructions,
                 evidence_urls,
                 due_at,
                 updated_at,
                 created_at,
                 client_id,
                 run_id,
                 job_id`,
      [
        orgId,
        status,
        data.type,
        data.title,
        data.instructions ?? null,
        JSON.stringify(evidenceUrls),
        data.dueAt ?? null,
        data.clientId ?? null,
        data.runId ?? null,
        data.jobId ?? null
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      status: row.status,
      type: row.type,
      title: row.title,
      instructions: row.instructions,
      evidenceUrls: row.evidence_urls ?? [],
      dueAt: row.due_at,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      clientId: row.client_id,
      clientName: null,
      runId: row.run_id,
      jobId: row.job_id,
      jobTitle: null
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error("MISSING_TODOS_TABLE");
    }
    throw error;
  }
}

export async function updateTodo(
  orgId: string,
  todoId: string,
  updates: TodoUpdateInput
): Promise<{ rowCount: number }> {
  const fields: string[] = [];
  const values: unknown[] = [orgId, todoId];
  let index = values.length + 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(updates.title);
  }

  if (updates.instructions !== undefined) {
    fields.push(`instructions = $${index++}`);
    values.push(updates.instructions ?? null);
  }

  if (updates.dueAt !== undefined) {
    fields.push(`due_at = $${index++}`);
    values.push(updates.dueAt ?? null);
  }

  if (updates.evidenceUrls !== undefined) {
    fields.push(`evidence_urls = $${index++}::jsonb`);
    values.push(JSON.stringify(updates.evidenceUrls ?? []));
  }

  if (fields.length === 0) {
    return { rowCount: 0 };
  }

  fields.push("updated_at = NOW()");

  try {
    const result = await query(
      `UPDATE todos
       SET ${fields.join(", ")}
       WHERE org_id = $1 AND id = $2`,
      values
    );

    return { rowCount: result.rowCount ?? 0 };
  } catch (error) {
    if (isMissingTableError(error)) {
      return { rowCount: 0 };
    }
    throw error;
  }
}

export async function transitionTodoStatus(
  orgId: string,
  todoId: string,
  status: TodoStatus
): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE todos
       SET status = $3,
           updated_at = NOW()
       WHERE org_id = $1 AND id = $2`,
      [orgId, todoId, status]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (isMissingTableError(error)) {
      return false;
    }
    throw error;
  }
}

export async function deleteTodo(orgId: string, todoId: string): Promise<boolean> {
  try {
    const result = await query("DELETE FROM todos WHERE org_id = $1 AND id = $2", [
      orgId,
      todoId
    ]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (isMissingTableError(error)) {
      return false;
    }
    throw error;
  }
}
