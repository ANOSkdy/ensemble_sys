import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aiProposalSchema, editableFieldKeys } from "@/lib/ai-proposals";
import { hasDatabaseUrl, query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { ApplyProposalForm } from "@/app/jobs/[jobId]/ai/[proposalId]/apply-proposal-form";
import { applyProposalAction } from "@/app/jobs/[jobId]/ai/[proposalId]/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const jobIdSchema = z.string().uuid();
const proposalIdSchema = z.string().uuid();

type JobPayload = Record<string, string | undefined>;

function parseErrorOutput(
  output: unknown
): { errorMessage: string; rawOutput?: string } | null {
  if (!output || typeof output !== "object") {
    return null;
  }
  const record = output as { error_message?: string; raw_output?: string };
  if (typeof record.error_message === "string") {
    return {
      errorMessage: record.error_message,
      rawOutput: record.raw_output
    };
  }
  return null;
}

export default async function JobAiProposalPage({
  params
}: {
  params: { jobId: string; proposalId: string };
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
            <p>DATABASE_URL が未設定のため、AI提案を表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const parsedJobId = jobIdSchema.safeParse(params.jobId);
  const parsedProposalId = proposalIdSchema.safeParse(params.proposalId);
  if (!parsedJobId.success || !parsedProposalId.success) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>AI提案</h1>
            <p>IDが不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const proposalResult = await query<{
    id: string;
    output_json: unknown;
    model: string;
    created_at: string;
    job_posting_id: string;
    job_id: string;
    internal_title: string;
    client_name: string;
  }>(
    `SELECT ap.id,
            ap.output_json,
            ap.model,
            ap.created_at,
            jp.id AS job_posting_id,
            jobs.id AS job_id,
            jobs.internal_title,
            clients.name AS client_name
     FROM ai_proposals AS ap
     JOIN job_postings AS jp ON jp.id = ap.job_posting_id
     JOIN jobs ON jobs.id = jp.job_id
     JOIN clients ON clients.id = jobs.client_id AND clients.org_id = jobs.org_id
     WHERE ap.id = $1 AND jobs.org_id = $2 AND jobs.id = $3
     LIMIT 1`,
    [parsedProposalId.data, user.orgId, parsedJobId.data]
  );

  const proposal = proposalResult.rows[0];
  if (!proposal) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>AI提案</h1>
            <p>提案が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const baselineResult = await query<{ payload_json: JobPayload }>(
    `SELECT payload_json
     FROM job_revisions
     WHERE job_posting_id = $1 AND status = $2
     ORDER BY approved_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
     LIMIT 1`,
    [proposal.job_posting_id, "approved"]
  );

  const baseline = baselineResult.rows[0]?.payload_json ?? {};

  const errorOutput = parseErrorOutput(proposal.output_json);
  const parsedOutput = aiProposalSchema.safeParse(proposal.output_json);

  const changes = parsedOutput.success
    ? parsedOutput.data.changes.map((change) => ({
        fieldKey: change.field_key,
        before: baseline[change.field_key] ?? null,
        after: change.after,
        reason: change.reason
      }))
    : [];

  const riskChecks = parsedOutput.success ? parsedOutput.data.risk_checks : [];
  const questions = parsedOutput.success
    ? parsedOutput.data.questions_for_human
    : [];

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>AI提案</h1>
              <p>{proposal.internal_title}</p>
              <p>Client: {proposal.client_name}</p>
            </div>
            <div className="card-actions">
              <Link href={`/jobs/${proposal.job_id}/ai`} className="secondary-link">
                生成画面へ戻る
              </Link>
              <Link href={`/jobs/${proposal.job_id}`} className="secondary-link">
                求人詳細
              </Link>
            </div>
          </div>
          <dl>
            <div>
              <dt>Model</dt>
              <dd>{proposal.model}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(proposal.created_at).toLocaleString("ja-JP")}</dd>
            </div>
          </dl>
        </section>

        {errorOutput ? (
          <section className="card">
            <h2>エラー</h2>
            <p>{errorOutput.errorMessage}</p>
            {errorOutput.rawOutput ? (
              <pre className="code-block">{errorOutput.rawOutput}</pre>
            ) : null}
          </section>
        ) : null}

        {!parsedOutput.success && !errorOutput ? (
          <section className="card">
            <h2>AI提案の読み取りエラー</h2>
            <p>AI出力が正しく保存されていません。</p>
          </section>
        ) : null}

        {parsedOutput.success ? (
          <>
            <section className="card">
              <h2>Summary</h2>
              <p>{parsedOutput.data.summary}</p>
            </section>

            <section className="card">
              <h2>Risk Checks</h2>
              {riskChecks.length === 0 ? (
                <p>リスクチェックはありません。</p>
              ) : (
                <ul>
                  {riskChecks.map((risk, index) => (
                    <li key={`${risk.type}-${index}`}>
                      <strong>{risk.type}:</strong> {risk.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <h2>質問事項</h2>
              {questions.length === 0 ? (
                <p>追加の質問はありません。</p>
              ) : (
                <ul>
                  {questions.map((question, index) => (
                    <li key={`${question}-${index}`}>{question}</li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}

        <ApplyProposalForm
          changes={changes.filter((change) =>
            editableFieldKeys.includes(change.fieldKey as (typeof editableFieldKeys)[number])
          )}
          disabled={!parsedOutput.success}
          action={applyProposalAction.bind(
            null,
            proposal.job_id,
            proposal.id
          )}
        />
      </div>
    </main>
  );
}
