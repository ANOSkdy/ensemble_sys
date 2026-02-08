import Link from "next/link";
import { redirect } from "next/navigation";
import { listClients } from "@/lib/clients";
import { hasDatabaseUrl } from "@/lib/db";
import { listMeetings } from "@/lib/meetings";
import { requireUser } from "@/lib/server/auth";
import { parseMeetingFilters } from "@/app/meetings/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function snippet(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 80)}…`;
}

export default async function MeetingsPage({
  searchParams
}: {
  searchParams: {
    client?: string | string[];
    start_date?: string | string[];
    end_date?: string | string[];
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
            <h1>会議ログ一覧</h1>
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
            <h1>会議ログ一覧</h1>
            <p>DATABASE_URL が未設定のため、会議ログを表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const filters = await parseMeetingFilters(searchParams);
  const [meetings, clients] = await Promise.all([
    listMeetings(user.orgId, filters),
    listClients(user.orgId)
  ]);

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>会議ログ一覧</h1>
              <p>顧客ヒアリングの履歴を検索できます。</p>
            </div>
            <div className="card-actions">
              <Link href="/meetings/new" className="secondary-link">
                会議ログを作成
              </Link>
            </div>
          </div>
          <form className="filter-form" method="get">
            <div className="form-grid">
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
                <label htmlFor="start_date">Start</label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={filters.startDate ?? ""}
                />
              </div>
              <div>
                <label htmlFor="end_date">End</label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={filters.endDate ?? ""}
                />
              </div>
              <div>
                <label htmlFor="search">Memo</label>
                <input
                  id="search"
                  name="search"
                  type="text"
                  placeholder="メモ検索"
                  defaultValue={filters.search ?? ""}
                />
              </div>
            </div>
            <div className="actions">
              <button type="submit">絞り込む</button>
              <Link href="/meetings" className="secondary-link">
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
                  <th>Held At</th>
                  <th>Client</th>
                  <th>Snippet</th>
                  <th>Created By</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {meetings.length === 0 ? (
                  <tr>
                    <td colSpan={5}>会議ログが見つかりません。</td>
                  </tr>
                ) : (
                  meetings.map((meeting) => (
                    <tr key={meeting.id}>
                      <td>{formatDateTime(meeting.heldAt)}</td>
                      <td>
                        <Link href={`/meetings/${meeting.id}`}>
                          {meeting.clientName}
                        </Link>
                      </td>
                      <td>{snippet(meeting.memo)}</td>
                      <td>{meeting.createdByEmail ?? "—"}</td>
                      <td>{formatDateTime(meeting.updatedAt)}</td>
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
