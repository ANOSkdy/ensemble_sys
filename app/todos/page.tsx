import Link from "next/link";
import { redirect } from "next/navigation";
import { hasDatabaseUrl } from "@/lib/db";
import { listClients } from "@/lib/clients";
import { requireUser } from "@/lib/server/auth";
import { listTodos, TODO_STATUSES, TODO_TYPES } from "@/lib/todos";
import { parseTodoFilters } from "@/app/todos/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("ja-JP");
}

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

export default async function TodosPage({
  searchParams
}: {
  searchParams: {
    status?: string | string[];
    type?: string | string[];
    client?: string | string[];
    due_at?: string | string[];
    search?: string | string[];
  };
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
            <h1>ToDo一覧</h1>
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
            <h1>ToDo一覧</h1>
            <p>DATABASE_URL が未設定のため、ToDo を表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const filters = await parseTodoFilters(searchParams);
  const [todos, clients] = await Promise.all([
    listTodos(user.orgId, filters),
    listClients(user.orgId)
  ]);

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>ToDo一覧</h1>
              <p>Airワークの手動作業を組織単位で管理します。</p>
            </div>
            <div className="card-actions">
              <Link href="/" className="secondary-link">
                ダッシュボードへ
              </Link>
            </div>
          </div>
          <form className="filter-form" method="get">
            <div className="form-grid">
              <div>
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={filters.status ?? ""}>
                  <option value="">すべて</option>
                  {TODO_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="type">Type</label>
                <select id="type" name="type" defaultValue={filters.type ?? ""}>
                  <option value="">すべて</option>
                  {TODO_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="client">Client</label>
                <select id="client" name="client" defaultValue={filters.clientId ?? ""}>
                  <option value="">すべて</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="due_at">Due</label>
                <input
                  id="due_at"
                  name="due_at"
                  type="date"
                  defaultValue={filters.dueAt ?? ""}
                />
              </div>
              <div>
                <label htmlFor="search">Title</label>
                <input
                  id="search"
                  name="search"
                  type="text"
                  placeholder="タイトル検索"
                  defaultValue={filters.search ?? ""}
                />
              </div>
            </div>
            <div className="actions">
              <button type="submit">絞り込む</button>
              <Link href="/todos" className="secondary-link">
                リセット
              </Link>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Title</th>
                  <th>Due</th>
                  <th>Updated</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {todos.length === 0 ? (
                  <tr>
                    <td colSpan={7}>ToDo が見つかりません。</td>
                  </tr>
                ) : (
                  todos.map((todo) => (
                    <tr key={todo.id}>
                      <td>
                        <span className="tag">{statusLabels[todo.status]}</span>
                      </td>
                      <td>{typeLabels[todo.type]}</td>
                      <td>{todo.clientName ?? "—"}</td>
                      <td>
                        <Link href={`/todos/${todo.id}`}>{todo.title}</Link>
                      </td>
                      <td>{formatDate(todo.dueAt)}</td>
                      <td>{formatDateTime(todo.updatedAt)}</td>
                      <td>
                        <div className="link-stack">
                          {todo.runId ? (
                            <Link href={`/runs/${todo.runId}`}>Run #{todo.runId}</Link>
                          ) : null}
                          {todo.jobId ? (
                            <Link href={`/jobs/${todo.jobId}`}>
                              {todo.jobTitle ?? "Job"}
                            </Link>
                          ) : null}
                          {!todo.runId && !todo.jobId ? "—" : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
