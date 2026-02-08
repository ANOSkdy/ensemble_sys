"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPool, hasDatabaseUrl, query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { isMissingTableError } from "@/lib/clients";

const jobIdSchema = z.string().uuid();
const revisionIdSchema = z.string().uuid();

const optionalFieldSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().max(200).optional()
);

const draftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: optionalFieldSchema,
  description: z.string().trim().min(1).max(10000),
  workingLocationId: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(64).optional()
  ),
  jobType: optionalFieldSchema,
  occupationId: optionalFieldSchema
});

export type DraftFormState = {
  ok: boolean;
  message?: string;
};

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

function buildPayload(parsed: z.infer<typeof draftSchema>): Record<string, string> {
  const payload: Record<string, string> = {
    title: parsed.title,
    description: parsed.description
  };

  if (parsed.subtitle) {
    payload.subtitle = parsed.subtitle;
  }
  if (parsed.workingLocationId) {
    payload.working_location_id = parsed.workingLocationId;
  }
  if (parsed.jobType) {
    payload.job_type = parsed.jobType;
  }
  if (parsed.occupationId) {
    payload.occupation_id = parsed.occupationId;
  }

  return payload;
}

export async function saveDraft(
  jobId: string,
  _prevState: DraftFormState,
  formData: FormData
): Promise<DraftFormState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedJobId = jobIdSchema.safeParse(jobId);
  if (!parsedJobId.success) {
    return { ok: false, message: "求人IDが不正です。" };
  }

  const parsedDraft = draftSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    description: formData.get("description"),
    workingLocationId: formData.get("working_location_id"),
    jobType: formData.get("job_type"),
    occupationId: formData.get("occupation_id")
  });

  if (!parsedDraft.success) {
    return { ok: false, message: "必須項目を入力してください。" };
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

  const jobResult = await query<{
    job_id: string;
    client_id: string;
    job_posting_id: string;
  }>(
    `SELECT jobs.id AS job_id, jobs.client_id, posting.id AS job_posting_id
     FROM jobs
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

  const jobRow = jobResult.rows[0];
  if (!jobRow) {
    return { ok: false, message: "求人が見つかりません。" };
  }

  if (parsedDraft.data.workingLocationId) {
    const locationResult = await query<{ id: string }>(
      `SELECT al.id
       FROM airwork_locations AS al
       JOIN clients AS c ON c.id = al.client_id
       WHERE c.org_id = $1 AND al.client_id = $2 AND al.working_location_id = $3
       LIMIT 1`,
      [
        user.orgId,
        jobRow.client_id,
        parsedDraft.data.workingLocationId
      ]
    );

    if (locationResult.rows.length === 0) {
      return {
        ok: false,
        message: "勤務先がクライアントの登録済み拠点に一致しません。"
      };
    }
  }

  const payload = buildPayload(parsedDraft.data);
  const payloadString = stableStringify(payload);
  const payloadHash = createHash("sha256")
    .update(payloadString)
    .digest("hex");

  const existingDraft = await query<{ id: string; payload_hash: string | null }>(
    `SELECT id, payload_hash
     FROM job_revisions
     WHERE job_posting_id = $1 AND status = $2
     ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
     LIMIT 1`,
    [jobRow.job_posting_id, "draft"]
  );

  const draftRow = existingDraft.rows[0];
  if (draftRow && draftRow.payload_hash === payloadHash) {
    return { ok: true, message: "変更はありません。" };
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (draftRow) {
      await client.query(
        `UPDATE job_revisions
         SET payload_json = $2,
             payload_hash = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [draftRow.id, payload, payloadHash]
      );
    } else {
      await client.query(
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
           payload_hash
         )
         SELECT $1, next_rev.rev_no, $2, $3, $4, $5
         FROM next_rev`,
        [jobRow.job_posting_id, "manual", "draft", payload, payloadHash]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (isMissingTableError(error)) {
      return { ok: false, message: "まだ求人用テーブルがありません。" };
    }
    throw error;
  } finally {
    client.release();
  }

  revalidatePath(`/jobs/${parsedJobId.data}`);
  revalidatePath(`/jobs/${parsedJobId.data}/edit`);
  revalidatePath(`/jobs/${parsedJobId.data}/revisions`);

  return { ok: true, message: "下書きを保存しました。" };
}

export type RevisionActionState = {
  ok: boolean;
  message?: string;
};

export async function submitForReview(
  revId: string
): Promise<RevisionActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedRevId = revisionIdSchema.safeParse(revId);
  if (!parsedRevId.success) {
    return { ok: false, message: "リビジョンIDが不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const result = await query<{ job_id: string }>(
    `WITH target AS (
       SELECT jr.id, j.id AS job_id
       FROM job_revisions AS jr
       JOIN job_postings AS jp ON jp.id = jr.job_posting_id
       JOIN jobs AS j ON j.id = jp.job_id
       WHERE jr.id = $1 AND j.org_id = $2 AND jp.channel = $3
     )
     UPDATE job_revisions AS jr
     SET status = $4,
         updated_at = NOW()
     FROM target
     WHERE jr.id = target.id AND jr.status = $5
     RETURNING target.job_id`,
    [parsedRevId.data, user.orgId, "airwork", "in_review", "draft"]
  );

  const row = result.rows[0];
  if (!row) {
    return { ok: false, message: "下書きが見つかりません。" };
  }

  revalidatePath(`/jobs/${row.job_id}`);
  revalidatePath(`/jobs/${row.job_id}/revisions`);

  return { ok: true, message: "レビュー待ちに変更しました。" };
}

export async function approveRevision(
  revId: string
): Promise<RevisionActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedRevId = revisionIdSchema.safeParse(revId);
  if (!parsedRevId.success) {
    return { ok: false, message: "リビジョンIDが不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const result = await query<{ job_id: string }>(
    `WITH target AS (
       SELECT jr.id, j.id AS job_id
       FROM job_revisions AS jr
       JOIN job_postings AS jp ON jp.id = jr.job_posting_id
       JOIN jobs AS j ON j.id = jp.job_id
       WHERE jr.id = $1 AND j.org_id = $2 AND jp.channel = $3
     )
     UPDATE job_revisions AS jr
     SET status = $4,
         approved_by = $5,
         approved_at = NOW(),
         updated_at = NOW()
     FROM target
     WHERE jr.id = target.id AND jr.status IN ($6, $7)
     RETURNING target.job_id`,
    [
      parsedRevId.data,
      user.orgId,
      "airwork",
      "approved",
      user.userId,
      "draft",
      "in_review"
    ]
  );

  const row = result.rows[0];
  if (!row) {
    return { ok: false, message: "承認対象が見つかりません。" };
  }

  revalidatePath(`/jobs/${row.job_id}`);
  revalidatePath(`/jobs/${row.job_id}/revisions`);

  return { ok: true, message: "承認済みにしました。" };
}
