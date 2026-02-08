"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aiProposalSchema, editableFieldKeys } from "@/lib/ai-proposals";
import { getPool, hasDatabaseUrl, query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";

export type ApplyProposalState = {
  ok: boolean;
  message?: string;
};

const jobIdSchema = z.string().uuid();
const proposalIdSchema = z.string().uuid();

type JobPayload = Record<string, string>;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([keyA], [keyB]) => keyA.localeCompare(keyB)
    );
    const body = entries
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${stableStringify(item)}`
      )
      .join(",");
    return `{${body}}`;
  }
  return JSON.stringify(value);
}

export async function applyProposalAction(
  jobId: string,
  proposalId: string,
  _prevState: ApplyProposalState,
  formData: FormData
): Promise<ApplyProposalState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedJobId = jobIdSchema.safeParse(jobId);
  if (!parsedJobId.success) {
    return { ok: false, message: "求人IDが不正です。" };
  }

  const parsedProposalId = proposalIdSchema.safeParse(proposalId);
  if (!parsedProposalId.success) {
    return { ok: false, message: "提案IDが不正です。" };
  }

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
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const proposalResult = await query<{
    id: string;
    output_json: unknown;
    job_posting_id: string;
    job_id: string;
  }>(
    `SELECT ap.id,
            ap.output_json,
            jp.id AS job_posting_id,
            jobs.id AS job_id
     FROM ai_proposals AS ap
     JOIN job_postings AS jp ON jp.id = ap.job_posting_id
     JOIN jobs ON jobs.id = jp.job_id
     WHERE ap.id = $1 AND jobs.org_id = $2 AND jobs.id = $3
     LIMIT 1`,
    [parsedProposalId.data, user.orgId, parsedJobId.data]
  );

  const proposal = proposalResult.rows[0];
  if (!proposal) {
    return { ok: false, message: "提案が見つかりません。" };
  }

  const parsedOutput = aiProposalSchema.safeParse(proposal.output_json);
  if (!parsedOutput.success) {
    return {
      ok: false,
      message: "AI提案の内容が不正なため適用できません。"
    };
  }

  const acceptedFields = new Set(
    editableFieldKeys.filter(
      (fieldKey) => formData.get(`accept_${fieldKey}`) === "on"
    )
  );

  const filteredChanges = parsedOutput.data.changes.filter((change) =>
    acceptedFields.has(change.field_key)
  );

  if (filteredChanges.length === 0) {
    return { ok: false, message: "適用する変更が選択されていません。" };
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const baselineResult = await client.query<{ payload_json: JobPayload }>(
      `SELECT payload_json
       FROM job_revisions
       WHERE job_posting_id = $1 AND status = $2
       ORDER BY approved_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
       LIMIT 1`,
      [proposal.job_posting_id, "approved"]
    );

    const baseline = baselineResult.rows[0]?.payload_json;
    if (!baseline) {
      await client.query("ROLLBACK");
      return { ok: false, message: "承認済みリビジョンが見つかりません。" };
    }

    const nextPayload: JobPayload = { ...baseline };
    for (const change of filteredChanges) {
      nextPayload[change.field_key] = change.after;
    }

    const payloadHash = createHash("sha256")
      .update(stableStringify(nextPayload))
      .digest("hex");

    const insertResult = await client.query<{ id: string }>(
      `WITH next_rev AS (
         SELECT COALESCE(MAX(rev_no), 0) + 1 AS rev_no
         FROM job_revisions
         WHERE job_posting_id = $1
       )
       INSERT INTO job_revisions (
         job_posting_id,
         rev_no,
         source,
         status,
         payload_json,
         payload_hash,
         approved_by,
         approved_at
       )
       SELECT $1, next_rev.rev_no, $2, $3, $4, $5, $6, NOW()
       FROM next_rev
       RETURNING id`,
      [
        proposal.job_posting_id,
        "ai",
        "approved",
        nextPayload,
        payloadHash,
        user.userId
      ]
    );

    const newRevisionId = insertResult.rows[0]?.id;
    if (!newRevisionId) {
      await client.query("ROLLBACK");
      return { ok: false, message: "新しいリビジョンの作成に失敗しました。" };
    }

    await client.query(
      `INSERT INTO audit_logs (org_id, action, payload_json, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        user.orgId,
        "apply_ai_proposal",
        {
          proposal_id: proposal.id,
          revision_id: newRevisionId
        },
        user.userId
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath(`/jobs/${proposal.job_id}`);
  revalidatePath(`/jobs/${proposal.job_id}/revisions`);
  revalidatePath(`/jobs/${proposal.job_id}/ai/${proposal.id}`);

  redirect(`/jobs/${proposal.job_id}/revisions`);
}
