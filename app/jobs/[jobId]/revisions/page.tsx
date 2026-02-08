import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl, query } from "@/lib/db";
import { approveRevision, submitForReview } from "@/app/jobs/[jobId]/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const jobIdSchema = z.string().uuid();

const diffKeys = [
  "title",
  "subtitle",
  "description",
  "working_location_id",
  "job_type",
  "occupation_id"
];

type JobRow = {
  id: string;
  internal_title: string;
  client_name: string;
  job_posting_id: string;
};

type RevisionRow = {
  id: string;
  rev_no: number;
  source: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  payload_json: Record<string, string> | null;
};

type DiffRow = {
  key: string;
  fromValue: string | null;
  toValue: string | null;
  change: "added" | "removed" | "changed";
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

function getPayloadValue(
  payload: Record<string, string> | null,
  key: string
): string | null {
  if (!payload) {
    return null;
  }
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function buildDiff(
  fromPayload: Record<string, string> | null,
  toPayload: Record<string, string> | null
): DiffRow[] {
  const diffs: DiffRow[] = [];

  diffKeys.forEach((key) => {
    const fromValue = getPayloadValue(fromPayload, key);
    const toValue = getPayloadValue(toPayload, key);

    if (fromValue === toValue) {
      return;
    }

    if (fromValue === null && toValue !== null) {
      diffs.push({ key, fromValue, toValue, change: "added" });
      return;
    }

    if (fromValue !== null && toValue === null) {
      diffs.push({ key, fromValue, toValue, change: "removed" });
      return;
    }

    diffs.push({
      key,
      fromValue,
      toValue,
      change: "changed"
    });
  });

  return diffs;
}

export default async function JobRevisionsPage({
  params,
  searchParams
}: {
  params: { jobId: string };
  searchParams?: { from?: string; to?: string };
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
            <h1>リビジョン</h1>
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
            <h1>リビジョン</h1>
            <p>DATABASE_URL が未設定のため、求人を表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const parsedJobId = jobIdSchema.safeParse(params.jobId);
  if (!parsedJobId.success) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>リビジョン</h1>
            <p>求人IDが不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const jobResult = await query<JobRow>(
    `SELECT jobs.id,
            jobs.internal_title,
            clients.name AS client_name,
            posting.id AS job_posting_id
     FROM jobs
     JOIN clients ON clients.id = jobs.client_id AND clients.org_id = jobs.org_id
     JOIN LATERAL (
       SELECT id
       FROM job_postings
       WHERE job_postings.job_id = jobs.id AND job_postings.channel = $3
       ORDER BY job_postings.created_at DESC NULLS LAST
       LIMIT 1
     ) AS posting ON true
     WHERE jobs.org_id = $1 AND jobs.id = $2
     LIMIT 1`,
    [user.orgId, parsedJobId.data, "airwork"]
  );

  const job = jobResult.rows[0];
  if (!job) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>リビジョン</h1>
            <p>求人が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const revisionsResult = await query<RevisionRow>(
    `SELECT id, rev_no, source, status, created_at, approved_at, payload_json
     FROM job_revisions
     WHERE job_posting_id = $1
     ORDER BY rev_no DESC`,
    [job.job_posting_id]
  );

  const revisions = revisionsResult.rows;
  const latestDraft = revisions.find((rev) => rev.status === "draft") ?? null;
  const latestApproved = revisions
    .filter((rev) => rev.status === "approved")
    .sort((a, b) => {
      const aTime = a.approved_at ? new Date(a.approved_at).getTime() : 0;
      const bTime = b.approved_at ? new Date(b.approved_at).getTime() : 0;
      return bTime - aTime;
    })[0];

  const fromId = typeof searchParams?.from === "string" ? searchParams.from : "";
  const toId = typeof searchParams?.to === "string" ? searchParams.to : "";

  const defaultFrom = fromId || latestApproved?.id || revisions[0]?.id || "";
  const defaultTo = toId || latestDraft?.id || revisions[0]?.id || "";

  const fromRevision = revisions.find((rev) => rev.id === defaultFrom) ?? null;
  const toRevision = revisions.find((rev) => rev.id === defaultTo) ?? null;

  const diffRows = buildDiff(
    fromRevision?.payload_json ?? null,
    toRevision?.payload_json ?? null
  );

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>リビジョン</h1>
              <p>{job.internal_title}</p>
              <p>Client: {job.client_name}</p>
            </div>
            <div className="card-actions">
              <Link href={`/jobs/${job.id}`} className="secondary-link">
                詳細へ戻る
              </Link>
              <Link href={`/jobs/${job.id}/edit`} className="secondary-link">
                編集
              </Link>
            </div>
          </div>
          <p>
            承認済みリビジョンは複数存在し得るため、最新の approved_at を優先して
            Run 生成の対象とします。
          </p>
        </section>

        <section className="card">
          <h2>リビジョン一覧</h2>
          {revisions.length === 0 ? (
            <p>まだリビジョンがありません。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>rev_no</th>
                    <th>source</th>
                    <th>status</th>
                    <th>created_at</th>
                    <th>approved_at</th>
                    <th>action</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((rev) => (
                    <tr key={rev.id}>
                      <td>{rev.rev_no}</td>
                      <td>{rev.source ?? "—"}</td>
                      <td>{rev.status}</td>
                      <td>{formatDateTime(rev.created_at)}</td>
                      <td>{formatDateTime(rev.approved_at)}</td>
                      <td>
                        {rev.status === "draft" ? (
                          <form action={submitForReview.bind(null, rev.id)}>
                            <button type="submit">レビュー依頼</button>
                          </form>
                        ) : rev.status === "in_review" ? (
                          <form action={approveRevision.bind(null, rev.id)}>
                            <button type="submit">承認</button>
                          </form>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>差分表示</h2>
          {revisions.length === 0 ? (
            <p>比較対象がありません。</p>
          ) : (
            <>
              <form method="get" className="form-grid">
                <div>
                  <label htmlFor="from">From</label>
                  <select id="from" name="from" defaultValue={defaultFrom}>
                    {revisions.map((rev) => (
                      <option key={rev.id} value={rev.id}>
                        rev {rev.rev_no} ({rev.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="to">To</label>
                  <select id="to" name="to" defaultValue={defaultTo}>
                    {revisions.map((rev) => (
                      <option key={rev.id} value={rev.id}>
                        rev {rev.rev_no} ({rev.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label aria-hidden="true" style={{ visibility: "hidden" }}>
                    Compare
                  </label>
                  <button type="submit">比較</button>
                </div>
              </form>
              {diffRows.length === 0 ? (
                <p>差分はありません。</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>key</th>
                        <th>change</th>
                        <th>from</th>
                        <th>to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.key}</td>
                          <td>{row.change}</td>
                          <td>{row.fromValue ?? "—"}</td>
                          <td>{row.toValue ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
