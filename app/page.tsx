import Link from "next/link";
import { hasDatabaseUrl } from "@/lib/db";
import { isMissingTableError } from "@/lib/todos";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SummaryCounts = {
  openTodos: number;
  inProgressTodos: number;
  freshnessCandidates: number;
};

type RecentRun = {
  id: number;
  run_type: string;
  status: string;
  file_format: string | null;
  created_at: string;
};

async function fetchCount(
  text: string,
  params: unknown[]
): Promise<number> {
  try {
    const result = await query<{ count: string }>(text, params);
    return Number(result.rows[0]?.count ?? 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      return 0;
    }
    throw error;
  }
}

async function fetchRecentRuns(orgId: number): Promise<RecentRun[]> {
  try {
    const result = await query<RecentRun>(
      `SELECT id, run_type, status, file_format, created_at
       FROM runs
       WHERE org_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [orgId]
    );
    return result.rows;
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export default async function HomePage() {
  let dbStatus: "ready" | "missing" | "unavailable" = "ready";
  let sessionEmail: string | null = null;
  let authMissing = false;
  let counts: SummaryCounts = {
    openTodos: 0,
    inProgressTodos: 0,
    freshnessCandidates: 0
  };
  let recentRuns: RecentRun[] = [];

  try {
    const user = await requireUser();
    sessionEmail = user.email;
    if (hasDatabaseUrl() && user.orgId !== null) {
      const [openTodos, inProgressTodos, freshnessCandidates, runs] =
        await Promise.all([
          fetchCount(
            "SELECT COUNT(*) FROM todos WHERE org_id = $1 AND status = $2",
            [user.orgId, "open"]
          ),
          fetchCount(
            "SELECT COUNT(*) FROM todos WHERE org_id = $1 AND status = $2",
            [user.orgId, "in_progress"]
          ),
          fetchCount(
            `SELECT COUNT(*) FROM job_postings
             WHERE org_id = $1
             AND (is_refresh_candidate = TRUE OR freshness_expires_at <= NOW())`,
            [user.orgId]
          ),
          fetchRecentRuns(user.orgId)
        ]);
      counts = { openTodos, inProgressTodos, freshnessCandidates };
      recentRuns = runs;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      sessionEmail = null;
      authMissing = true;
    } else {
      dbStatus = "unavailable";
    }
  }

  if (!hasDatabaseUrl()) {
    dbStatus = "missing";
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>運用ダッシュボード</h1>
          <p>ToDo、Run、鮮度の状態をひと目で確認できます。</p>
          <div className="actions">
            {sessionEmail ? <span>ログイン中: {sessionEmail}</span> : null}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="secondary">
                ログアウト
              </button>
            </form>
          </div>
        </section>
        {authMissing ? (
          <section className="card">
            <h2>ログインが必要です</h2>
            <p>
              セッションが確認できませんでした。再度ログインしてください。
            </p>
            <Link href="/login" className="button-link">
              ログイン画面へ
            </Link>
          </section>
        ) : null}
        <section className="card">
          <h2>サマリー</h2>
          {dbStatus === "missing" ? (
            <p>DATABASE_URL が未設定のため、データを取得できません。</p>
          ) : dbStatus === "unavailable" ? (
            <p>データベースに接続できませんでした。設定をご確認ください。</p>
          ) : (
            <div className="summary-grid">
              <div className="summary-card">
                <p className="summary-label">Open ToDo</p>
                <p className="summary-value">{counts.openTodos}</p>
              </div>
              <div className="summary-card">
                <p className="summary-label">In Progress</p>
                <p className="summary-value">{counts.inProgressTodos}</p>
              </div>
              <div className="summary-card">
                <p className="summary-label">鮮度対象</p>
                <p className="summary-value">{counts.freshnessCandidates}</p>
              </div>
            </div>
          )}
        </section>
        <section className="card">
          <h2>直近のRun</h2>
          {recentRuns.length === 0 ? (
            <p>まだRunがありません。</p>
          ) : (
            <div className="list">
              {recentRuns.map((run) => (
                <div key={run.id} className="list-item">
                  <div>
                    <p className="list-title">{run.run_type}</p>
                    <p className="list-meta">
                      {run.status} · {run.file_format ?? "N/A"}
                    </p>
                  </div>
                  <div className="list-meta">
                    <span>{new Date(run.created_at).toLocaleString()}</span>
                    <Link href={`/runs/${run.id}`}>詳細</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card">
          <h2>クイックリンク</h2>
          <div className="link-grid">
            <Link href="/clients" className="link-card">
              Clients
            </Link>
            <Link href="/jobs" className="link-card">
              Jobs
            </Link>
            <Link href="/runs" className="link-card">
              Runs
            </Link>
            <Link href="/todos" className="link-card">
              Todos
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
