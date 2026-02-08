import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl, query } from "@/lib/db";
import { listLocations } from "@/lib/airwork-locations";
import { isMissingTableError } from "@/lib/clients";
import { JobRevisionForm } from "@/app/jobs/[jobId]/edit/job-revision-form";
import { saveDraft } from "@/app/jobs/[jobId]/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const jobIdSchema = z.string().uuid();

type AirworkCode = {
  code: string;
  name_ja: string;
};

type RevisionRow = {
  id: string;
  rev_no: number;
  status: string;
  payload_json: Record<string, string> | null;
  created_at: string;
  updated_at: string | null;
  approved_at: string | null;
};

type JobDetail = {
  id: string;
  internal_title: string;
  client_id: string;
  client_name: string;
  job_posting_id: string;
};

async function listAirworkCodes(fieldKey: string): Promise<AirworkCode[]> {
  try {
    const result = await query<AirworkCode>(
      `SELECT code, name_ja
       FROM airwork_codes
       WHERE field_key = $1 AND is_active = true
       ORDER BY code ASC`,
      [fieldKey]
    );
    return result.rows;
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

function extractPayloadValue(
  payload: Record<string, string> | null,
  key: string
): string | undefined {
  if (!payload) {
    return undefined;
  }
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

export default async function JobEditPage({
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
            <h1>求人編集</h1>
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
            <h1>求人編集</h1>
            <p>DATABASE_URL が未設定のため、求人を編集できません。</p>
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
            <h1>求人編集</h1>
            <p>求人IDが不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const jobResult = await query<JobDetail>(
    `SELECT jobs.id,
            jobs.internal_title,
            jobs.client_id,
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
            <h1>求人編集</h1>
            <p>求人が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const [locations, jobTypeCodes, occupationCodes, draftResult, approvedResult] =
    await Promise.all([
      listLocations(user.orgId, job.client_id),
      listAirworkCodes("job_type"),
      listAirworkCodes("occupation_id"),
      query<RevisionRow>(
        `SELECT id, rev_no, status, payload_json, created_at, updated_at, approved_at
         FROM job_revisions
         WHERE job_posting_id = $1 AND status = $2
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT 1`,
        [job.job_posting_id, "draft"]
      ),
      query<RevisionRow>(
        `SELECT id, rev_no, status, payload_json, created_at, updated_at, approved_at
         FROM job_revisions
         WHERE job_posting_id = $1 AND status = $2
         ORDER BY approved_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT 1`,
        [job.job_posting_id, "approved"]
      )
    ]);

  const draft = draftResult.rows[0] ?? null;
  const approved = approvedResult.rows[0] ?? null;
  const payload = draft?.payload_json ?? approved?.payload_json ?? null;

  const formAction = saveDraft.bind(null, parsedJobId.data);

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>求人編集</h1>
              <p>{job.internal_title}</p>
              <p>クライアント: {job.client_name}</p>
            </div>
            <div className="card-actions">
              <Link href={`/jobs/${job.id}`} className="secondary-link">
                詳細へ戻る
              </Link>
              <Link href={`/jobs/${job.id}/revisions`} className="secondary-link">
                revisions
              </Link>
            </div>
          </div>
          <p>
            下書きがない場合は、保存時に新しい下書きを作成します。直近の承認版を
            初期値として表示しています。
          </p>
          {draft ? (
            <p>
              現在の下書き: rev {draft.rev_no} / 更新: {draft.updated_at ?? draft.created_at}
            </p>
          ) : (
            <p>下書きはまだありません。</p>
          )}
        </section>

        <JobRevisionForm
          action={formAction}
          defaultValues={{
            title: extractPayloadValue(payload, "title"),
            subtitle: extractPayloadValue(payload, "subtitle"),
            description: extractPayloadValue(payload, "description"),
            workingLocationId: extractPayloadValue(payload, "working_location_id"),
            jobType: extractPayloadValue(payload, "job_type"),
            occupationId: extractPayloadValue(payload, "occupation_id")
          }}
          locations={locations.map((location) => ({
            id: location.id,
            value: location.workingLocationId,
            label: `${location.workingLocationId} ${location.nameJa ?? ""}`.trim()
          }))}
          jobTypeCodes={jobTypeCodes.map((code) => ({
            code: code.code,
            name: code.name_ja
          }))}
          occupationCodes={occupationCodes.map((code) => ({
            code: code.code,
            name: code.name_ja
          }))}
        />
      </div>
    </main>
  );
}
