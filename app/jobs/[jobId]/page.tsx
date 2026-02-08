import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl, query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const jobIdSchema = z.string().uuid();

type JobDetailRow = {
  id: string;
  internal_title: string;
  status: string;
  client_name: string;
  job_offer_id: string | null;
  freshness_expires_at: string | null;
  job_posting_id: string | null;
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

export default async function JobDetailPage({
  params
}: {
  params: { jobId: string };
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
            <h1>求人詳細</h1>
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
            <h1>求人詳細</h1>
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
            <h1>求人詳細</h1>
            <p>求人IDが不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const result = await query<JobDetailRow>(
    `SELECT jobs.id,
            jobs.internal_title,
            jobs.status,
            clients.name AS client_name,
            posting.job_offer_id,
            posting.freshness_expires_at,
            posting.id AS job_posting_id
     FROM jobs
     JOIN clients ON clients.id = jobs.client_id AND clients.org_id = jobs.org_id
     LEFT JOIN LATERAL (
       SELECT id, job_offer_id, freshness_expires_at
       FROM job_postings
       WHERE job_postings.job_id = jobs.id AND job_postings.channel = $3
       ORDER BY job_postings.created_at DESC NULLS LAST
       LIMIT 1
     ) AS posting ON true
     WHERE jobs.org_id = $1 AND jobs.id = $2
     LIMIT 1`,
    [user.orgId, parsedJobId.data, "airwork"]
  );

  const job = result.rows[0];
  if (!job) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>求人詳細</h1>
            <p>求人が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>求人詳細</h1>
              <p>{job.internal_title}</p>
              <p>Client: {job.client_name}</p>
            </div>
            <div className="card-actions">
              <Link href={`/jobs/${job.id}/edit`} className="secondary-link">
                編集
              </Link>
              <Link href={`/jobs/${job.id}/ai`} className="secondary-link">
                AI提案
              </Link>
              <Link href={`/jobs/${job.id}/revisions`} className="secondary-link">
                revisions
              </Link>
            </div>
          </div>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{job.status}</dd>
            </div>
            <div>
              <dt>Job Offer ID</dt>
              <dd>{job.job_offer_id ?? "—"}</dd>
            </div>
            <div>
              <dt>Freshness Expires</dt>
              <dd>{formatDateTime(job.freshness_expires_at)}</dd>
            </div>
          </dl>
          {!job.job_posting_id ? (
            <p>Airワークの投稿枠がまだありません。</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
