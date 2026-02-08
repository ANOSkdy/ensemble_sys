import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import { listClients } from "@/lib/clients";
import { jobStatusSchema, listJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  q?: string;
  client?: string;
  status?: string;
  has_job_offer_id?: string;
  refresh_candidate?: string;
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

export default async function JobsPage({
  searchParams
}: {
  searchParams?: SearchParams;
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
            <h1>求人一覧</h1>
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
            <h1>求人一覧</h1>
            <p>DATABASE_URL が未設定のため、求人を表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const rawSearch = typeof searchParams?.q === "string" ? searchParams.q : "";
  const rawClient =
    typeof searchParams?.client === "string" ? searchParams.client : "";
  const statusValue =
    typeof searchParams?.status === "string" ? searchParams.status : "";
  const hasJobOfferIdValue =
    typeof searchParams?.has_job_offer_id === "string"
      ? searchParams.has_job_offer_id
      : "";
  const refreshCandidateValue =
    typeof searchParams?.refresh_candidate === "string"
      ? searchParams.refresh_candidate
      : "";

  const statusFilter = jobStatusSchema.safeParse(statusValue).success
    ? (statusValue as "active" | "archived")
    : undefined;

  const hasJobOfferIdFilter =
    hasJobOfferIdValue === "yes" || hasJobOfferIdValue === "no"
      ? hasJobOfferIdValue
      : undefined;

  const refreshCandidateFilter =
    refreshCandidateValue === "yes" || refreshCandidateValue === "no"
      ? refreshCandidateValue
      : undefined;

  const [clients, jobs] = await Promise.all([
    listClients(user.orgId),
    listJobs({
      orgId: user.orgId,
      clientId: rawClient.trim() || undefined,
      search: rawSearch,
      status: statusFilter,
      hasJobOfferId: hasJobOfferIdFilter,
      refreshCandidate: refreshCandidateFilter
    })
  ]);

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>求人一覧</h1>
              <p>顧客横断で求人の状況を確認できます。</p>
            </div>
            <Link href="/jobs/new" className="secondary-link">
              Create Job
            </Link>
          </div>
        </section>
        <section className="card">
          <h2>検索・フィルタ</h2>
          <form method="get" className="form-grid">
            <div>
              <label htmlFor="search">検索</label>
              <input
                id="search"
                name="q"
                type="search"
                placeholder="求人名またはクライアント名"
                defaultValue={rawSearch}
              />
            </div>
            <div>
              <label htmlFor="client">クライアント</label>
              <select id="client" name="client" defaultValue={rawClient}>
                <option value="">すべて</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status">ステータス</label>
              <select id="status" name="status" defaultValue={statusValue}>
                <option value="">すべて</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="has_job_offer_id">Job Offer ID</label>
              <select
                id="has_job_offer_id"
                name="has_job_offer_id"
                defaultValue={hasJobOfferIdValue}
              >
                <option value="">すべて</option>
                <option value="yes">あり</option>
                <option value="no">なし</option>
              </select>
            </div>
            <div>
              <label htmlFor="refresh_candidate">Refresh Candidate</label>
              <select
                id="refresh_candidate"
                name="refresh_candidate"
                defaultValue={refreshCandidateValue}
              >
                <option value="">すべて</option>
                <option value="yes">yes</option>
                <option value="no">no</option>
              </select>
            </div>
            <div>
              <label aria-hidden="true" style={{ visibility: "hidden" }}>
                Submit
              </label>
              <button type="submit">絞り込み</button>
            </div>
          </form>
        </section>
        <section className="card">
          <h2>求人リスト</h2>
          {jobs.length === 0 ? (
            <p>該当する求人がありません。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Job Offer ID</th>
                    <th>Freshness</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <Link href={`/home/${job.clientId}`}>
                          {job.clientName}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/jobs/${job.id}`}>
                          {job.internalTitle}
                        </Link>
                      </td>
                      <td>{job.status}</td>
                      <td>{job.jobOfferId ?? "—"}</td>
                      <td>{formatDate(job.freshnessExpiresAt)}</td>
                      <td>{formatDate(job.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
