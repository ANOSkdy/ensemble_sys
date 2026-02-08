import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getTodo, TODO_STATUSES, TODO_TYPES } from "@/lib/todos";
import { TodoActionForm } from "@/app/todos/todo-action-form";
import { transitionTodoStatusAction } from "@/app/todos/actions";
import { TodoEditForm } from "@/app/todos/todo-edit-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const todoIdSchema = z.string().uuid();

const statusLabels: Record<(typeof TODO_STATUSES)[number], string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
  canceled: "Canceled"
};

const typeLabels: Record<(typeof TODO_TYPES)[number], string> = {
  airwork_upload_file: "Airwork Upload",
  download_sync: "Download & Sync",
  link_new_job_offer_id: "Link Job Offer"
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ja-JP");
}

export default async function TodoDetailPage({
  params
}: {
  params: { todoId: string };
}) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }

  if (user.orgId === null) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>ToDo詳細</h1>
            <p>組織情報が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  if (!hasDatabaseUrl()) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>ToDo詳細</h1>
            <p>DATABASE_URL が未設定のため、ToDo を表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const parsedTodoId = todoIdSchema.safeParse(params.todoId);
  if (!parsedTodoId.success) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>ToDo詳細</h1>
            <p>ToDo ID が不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const todo = await getTodo(user.orgId, parsedTodoId.data);
  if (!todo) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>ToDo詳細</h1>
            <p>ToDo が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const toInProgress = transitionTodoStatusAction.bind(
    null,
    todo.id,
    "in_progress"
  );
  const toDone = transitionTodoStatusAction.bind(null, todo.id, "done");
  const toBlocked = transitionTodoStatusAction.bind(null, todo.id, "blocked");
  const toCanceled = transitionTodoStatusAction.bind(null, todo.id, "canceled");
  const toOpen = transitionTodoStatusAction.bind(null, todo.id, "open");

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>ToDo詳細</h1>
              <p>{todo.title}</p>
            </div>
            <div className="card-actions">
              <Link href="/todos" className="secondary-link">
                ToDo一覧へ
              </Link>
            </div>
          </div>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{statusLabels[todo.status]}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{typeLabels[todo.type]}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{todo.clientName ?? "—"}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(todo.updatedAt)}</dd>
            </div>
          </dl>
          <div className="link-stack">
            {todo.runId ? (
              <Link href={`/runs/${todo.runId}`}>Run #{todo.runId}</Link>
            ) : null}
            {todo.jobId ? (
              <Link href={`/jobs/${todo.jobId}`}>
                {todo.jobTitle ?? "求人詳細"}
              </Link>
            ) : null}
          </div>
        </section>

        <section className="card">
          <h2>ステータス更新</h2>
          <div className="actions">
            {todo.status !== "open" ? (
              <TodoActionForm
                action={toOpen}
                label="Openに戻す"
                variant="secondary"
              />
            ) : null}
            {todo.status === "open" ? (
              <TodoActionForm action={toInProgress} label="進行中にする" />
            ) : null}
            {todo.status === "in_progress" ? (
              <TodoActionForm action={toDone} label="完了にする" />
            ) : null}
            {todo.status !== "blocked" ? (
              <TodoActionForm
                action={toBlocked}
                label="Blockedにする"
                variant="secondary"
              />
            ) : null}
            {todo.status !== "canceled" ? (
              <TodoActionForm
                action={toCanceled}
                label="Canceledにする"
                variant="secondary"
              />
            ) : null}
          </div>
        </section>

        <TodoEditForm todo={todo} />
      </div>
    </main>
  );
}
