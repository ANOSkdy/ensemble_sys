import Link from "next/link";
import { hasDatabaseUrl, query } from "@/lib/db";
import { isMissingTableError } from "@/lib/todos";
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

async function fetchCount(text: string, params: unknown[]): Promise<number> {
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

async function fetchRecentRuns(orgId: string): Promise<RecentRun[]> {
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
        <section className="card hero">
          <div className="hero-grid">
            <div>
              <h1>ダッシュボード</h1>
              <p>ToDo / Runs など、主要データの状況をまとめて表示します。</p>

              <div className="actions">
                {sessionEmail ? (
                  <span className="icon-chip">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" />
                      <path
                        d="M4 20c2.5-4 13.5-4 16 0"
                        stroke="currentColor"
                      />
                    </svg>
                    ログイン中: {sessionEmail}
                  </span>
                ) : null}

                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="secondary">
                    ログアウト
                  </button>
                </form>
              </div>

              <div className="tab-bar" role="tablist" aria-label="主要リンク">
                <Link href="/clients" className="tab-link" role="tab">
                  顧客管理へ
                </Link>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-illustration">
                <div className="character" aria-hidden="true" />
                <div>
                  <div className="icon-chip">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="4"
                        y="4"
                        width="16"
                        height="16"
                        rx="4"
                        stroke="currentColor"
                      />
                      <path d="M8 12h8M8 16h5" stroke="currentColor" />
                    </svg>
                    今日のステータス
                  </div>
                  <p>運用状況をざっくり把握できます。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="section-divider" />

          <div className="process-flow">
            {["データ確認", "レポート", "改善", "運用"].map((step, index) => (
              <div key={step} className="process-step">
                <span>{index + 1}</span>
                <div>
                  <strong>{step}</strong>
                  <p>必要に応じて画面から次の作業へ進めます。</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <details className="card collapsible" open>
          <summary>サマリー</summary>
          <div className="collapsible-body">
            {dbStatus === "missing" ? (
              <p>DATABASE_URL が未設定のため、データ取得できません。</p>
            ) : dbStatus === "unavailable" ? (
              <p>データベースに接続できませんでした。設定を確認してください。</p>
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
          </div>
        </details>

        <details className="card collapsible">
          <summary>最近の Run</summary>
          <div className="collapsible-body">
            {recentRuns.length === 0 ? (
              <p>まだ Run がありません。</p>
            ) : (
              <div className="list">
                {recentRuns.map((run) => (
                  <div key={run.id} className="list-item">
                    <div>
                      <p className="list-title">{run.run_type}</p>
                      <p className="list-meta">
                        {run.status} / {run.file_format ?? "N/A"}
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
          </div>
        </details>

        <details className="card collapsible">
          <summary>クイックリンク</summary>
          <div className="collapsible-body">
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
          </div>
        </details>
      </div>
    </main>
  );
}
