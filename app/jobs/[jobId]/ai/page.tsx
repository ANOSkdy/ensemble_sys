import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { listMeetings } from "@/lib/meetings";
import { hasDatabaseUrl, query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { ProposalForm } from "@/app/jobs/[jobId]/ai/proposal-form";
import { generateProposalAction } from "@/app/jobs/[jobId]/ai/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const jobIdSchema = z.string().uuid();

type JobPayload = {
  title?: string;
  subtitle?: string;
  description?: string;
  job_type?: string;
};

type JobAiRow = {
  job_id: string;
  internal_title: string;
  client_id: string;
  client_name: string;
  job_posting_id: string | null;
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

export default async function JobAiPage({
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
            <h1>AI提案</h1>
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
            <h1>AI提案</h1>
            <p>DATABASE_URL が未設定のため、AI提案を生成できません。</p>
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
            <h1>AI提案</h1>
            <p>求人IDが不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const jobResult = await query<JobAiRow>(
    `SELECT jobs.id AS job_id,
            jobs.internal_title,
            jobs.client_id,
            clients.name AS client_name,
            posting.id AS job_posting_id
     FROM jobs
     JOIN clients ON clients.id = jobs.client_id AND clients.org_id = jobs.org_id
     LEFT JOIN LATERAL (
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
            <h1>AI提案</h1>
            <p>求人が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const revisionResult = job.job_posting_id
    ? await query<{ payload_json: JobPayload }>(
        `SELECT payload_json
         FROM job_revisions
         WHERE job_posting_id = $1 AND status = $2
         ORDER BY approved_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT 1`,
        [job.job_posting_id, "approved"]
      )
    : { rows: [] as Array<{ payload_json: JobPayload }> };

  const payload = revisionResult.rows[0]?.payload_json;

  const meetings = await listMeetings(user.orgId, { clientId: job.client_id });

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>AI提案</h1>
              <p>{job.internal_title}</p>
              <p>Client: {job.client_name}</p>
            </div>
            <div className="card-actions">
              <Link href={`/jobs/${job.job_id}`} className="secondary-link">
                求人詳細へ戻る
              </Link>
            </div>
          </div>
          {!job.job_posting_id ? (
            <p>Airワークの投稿枠がまだありません。</p>
          ) : null}
          {!payload ? (
            <p>承認済みの求人内容がないため、生成できません。</p>
          ) : null}
        </section>

        {job.job_posting_id && payload ? (
          <ProposalForm
            meetings={meetings.map((meeting) => ({
              id: meeting.id,
              label: `${formatDate(meeting.heldAt)} / ${meeting.clientName}`
            }))}
            action={generateProposalAction.bind(null, job.job_id)}
          />
        ) : (
          <section className="card">
            <h2>提案生成</h2>
            <p>承認済み求人がないため、提案生成は利用できません。</p>
          </section>
        )}

        <section className="card">
          <h2>現在の求人内容</h2>
          {!payload ? (
            <p>承認済みリビジョンがありません。</p>
          ) : (
            <dl>
              <div>
                <dt>Title</dt>
                <dd>{payload.title ?? "—"}</dd>
              </div>
              <div>
                <dt>Subtitle</dt>
                <dd>{payload.subtitle ?? "—"}</dd>
              </div>
              <div>
                <dt>Job Type</dt>
                <dd>{payload.job_type ?? "—"}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>
                  {payload.description ?? "—"}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}
