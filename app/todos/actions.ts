"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import {
  createTodo,
  getTodo,
  listTodos,
  todoCreateSchema,
  todoEvidenceUrlsSchema,
  todoIdSchema,
  todoStatusSchema,
  todoTypeSchema,
  updateTodo
} from "@/lib/todos";
import { getRunDetail, listRunItems } from "@/lib/server/runs";

export type TodoActionState = {
  ok: boolean;
  message?: string;
};

const titleSchema = z.string().trim().min(1).max(200);
const instructionsSchema = z
  .string()
  .trim()
  .max(10000)
  .transform((value) => (value.length === 0 ? null : value));
const dueAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value) => (value.length === 0 ? null : value));

export async function updateTodoAction(
  todoId: string,
  _prevState: TodoActionState,
  formData: FormData
): Promise<TodoActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const idResult = todoIdSchema.safeParse(todoId);
  if (!idResult.success) {
    return { ok: false, message: "ToDo ID が不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const rawTitle = formData.get("title");
  const rawInstructions = formData.get("instructions");
  const rawDueAt = formData.get("due_at");
  const rawEvidenceUrls = formData.get("evidence_urls");

  const titleResult = titleSchema.safeParse(
    typeof rawTitle === "string" ? rawTitle : ""
  );
  if (!titleResult.success) {
    return { ok: false, message: "タイトルを入力してください。" };
  }

  const instructionsResult = instructionsSchema.safeParse(
    typeof rawInstructions === "string" ? rawInstructions : ""
  );
  if (!instructionsResult.success) {
    return { ok: false, message: "メモは10000文字以内で入力してください。" };
  }

  let dueAtValue: string | null = null;
  if (typeof rawDueAt === "string" && rawDueAt.trim().length > 0) {
    const dueAtResult = dueAtSchema.safeParse(rawDueAt);
    if (!dueAtResult.success) {
      return { ok: false, message: "期限日が不正です。" };
    }
    dueAtValue = dueAtResult.data;
  }

  let evidenceUrls: string[] | undefined;
  if (typeof rawEvidenceUrls === "string" && rawEvidenceUrls.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawEvidenceUrls);
      const urlsResult = todoEvidenceUrlsSchema.safeParse(parsed);
      if (!urlsResult.success) {
        return { ok: false, message: "証跡URLが不正です。" };
      }
      evidenceUrls = urlsResult.data;
    } catch {
      return { ok: false, message: "証跡URLが不正です。" };
    }
  } else {
    evidenceUrls = [];
  }

  const result = await updateTodo(user.orgId, idResult.data, {
    title: titleResult.data,
    instructions: instructionsResult.data,
    dueAt: dueAtValue,
    evidenceUrls
  });

  if (result.rowCount === 0) {
    return { ok: false, message: "ToDo が見つかりません。" };
  }

  revalidatePath(`/todos/${idResult.data}`);
  revalidatePath("/todos");

  return { ok: true, message: "更新しました。" };
}

export async function transitionTodoStatusAction(
  todoId: string,
  newStatus: string,
  _prevState: TodoActionState,
  _formData: FormData
): Promise<TodoActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const idResult = todoIdSchema.safeParse(todoId);
  const statusResult = todoStatusSchema.safeParse(newStatus);
  if (!idResult.success || !statusResult.success) {
    return { ok: false, message: "ステータス更新に失敗しました。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const { transitionTodoStatus } = await import("@/lib/todos");
  const updated = await transitionTodoStatus(
    user.orgId,
    idResult.data,
    statusResult.data
  );

  revalidatePath(`/todos/${idResult.data}`);
  revalidatePath("/todos");

  return updated
    ? { ok: true, message: "ステータスを更新しました。" }
    : { ok: false, message: "ToDo が見つかりません。" };
}

export async function createTodoFromRunAction(
  runId: number,
  _prevState: TodoActionState,
  _formData: FormData
): Promise<TodoActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const runIdResult = z.coerce.number().int().positive().safeParse(runId);
  if (!runIdResult.success) {
    return { ok: false, message: "Run ID が不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const run = await getRunDetail(user.orgId, runIdResult.data);
  if (!run) {
    return { ok: false, message: "Run が見つかりません。" };
  }

  try {
    await createTodo(user.orgId, {
      title: "Upload run file to Airwork",
      type: "airwork_upload_file",
      status: "open",
      clientId: run.clientId,
      runId: run.id,
      instructions:
        "1. Airワーク管理画面で一括入稿ファイルをアップロードする。\n" +
        "2. 反映完了まで待機し、掲載内容を確認する。\n" +
        "3. 証跡（スクリーンショット等）を添付する。\n" +
        "4. 結果に応じてステータスを更新する。"
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return { ok: false, message: "ToDo テーブルが見つかりません。" };
    }
    throw error;
  }

  revalidatePath(`/runs/${run.id}`);
  revalidatePath("/todos");

  return { ok: true, message: "ToDo を作成しました。" };
}

export async function createFollowUpTodosAction(
  runId: number,
  _prevState: TodoActionState,
  _formData: FormData
): Promise<TodoActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const runIdResult = z.coerce.number().int().positive().safeParse(runId);
  if (!runIdResult.success) {
    return { ok: false, message: "Run ID が不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const run = await getRunDetail(user.orgId, runIdResult.data);
  if (!run) {
    return { ok: false, message: "Run が見つかりません。" };
  }

  const runItems = await listRunItems(user.orgId, run.id);
  const hasCreateActions = runItems.some((item) => item.action === "create");

  try {
    await createTodo(user.orgId, {
      title: "Download and sync run results",
      type: "download_sync",
      status: "open",
      clientId: run.clientId,
      runId: run.id,
      instructions:
        "1. Airワーク側で更新結果をダウンロードする。\n" +
        "2. Ensemble に同期し、差分を確認する。\n" +
        "3. 証跡を添付して完了にする。"
    });

    if (hasCreateActions) {
      await createTodo(user.orgId, {
        title: "Link new job_offer_id to Ensemble",
        type: "link_new_job_offer_id",
        status: "open",
        clientId: run.clientId,
        runId: run.id,
        instructions:
          "1. Airワーク側で新規作成分の job_offer_id を確認する。\n" +
          "2. Ensemble の求人に紐付けて同期する。\n" +
          "3. 証跡を添付して完了にする。"
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return { ok: false, message: "ToDo テーブルが見つかりません。" };
    }
    throw error;
  }

  revalidatePath(`/runs/${run.id}`);
  revalidatePath("/todos");

  return {
    ok: true,
    message: hasCreateActions
      ? "フォローアップ ToDo を作成しました。"
      : "フォローアップ ToDo を作成しました（job_offer_id なし）。"
  };
}

export async function createTodoFromApi(input: unknown) {
  const parsed = todoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "INVALID_INPUT" };
  }
  return { ok: true as const, data: parsed.data };
}

export async function ensureTodoExists(orgId: string, todoId: string) {
  const todo = await getTodo(orgId, todoId);
  return todo;
}

export async function listTodosForOrg(orgId: string) {
  return listTodos(orgId, {});
}

export async function parseTodoFilters(filters: {
  status?: string | string[];
  type?: string | string[];
  client?: string | string[];
  due_at?: string | string[];
  search?: string | string[];
}) {
  const parsed = z
    .object({
      status: todoStatusSchema.optional(),
      type: todoTypeSchema.optional(),
      client: z.string().uuid().optional(),
      due_at: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      search: z.string().trim().min(1).max(200).optional()
    })
    .safeParse({
      status: typeof filters.status === "string" ? filters.status : undefined,
      type: typeof filters.type === "string" ? filters.type : undefined,
      client: typeof filters.client === "string" ? filters.client : undefined,
      due_at: typeof filters.due_at === "string" ? filters.due_at : undefined,
      search: typeof filters.search === "string" ? filters.search : undefined
    });

  if (!parsed.success) {
    return {};
  }

  return {
    status: parsed.data.status,
    type: parsed.data.type,
    clientId: parsed.data.client,
    dueAt: parsed.data.due_at,
    search: parsed.data.search
  };
}
