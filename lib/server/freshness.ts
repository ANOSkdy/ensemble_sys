import "server-only";

import { createHash } from "crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";

type FreshnessCronSummary = {
  processedPostings: number;
  createdPostings: number;
  createdRuns: number;
  createdTodos: number;
  skippedAlreadyPlanned: number;
};

type OrgSummary = FreshnessCronSummary & {
  postingIds: string[];
  createdPostingIds: string[];
  runIds: number[];
  todoIds: string[];
};

type StalePostingRow = {
  posting_id: string;
  job_id: string;
  org_id: string;
  client_id: string;
  last_published_at: string | null;
  freshness_expires_at: string | null;
};

type RefreshItem = {
  orgId: string;
  clientId: string;
  jobId: string;
  jobPostingId: string;
  jobRevisionId: string;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        const item = (value as Record<string, unknown>)[key];
        return `${JSON.stringify(key)}:${stableStringify(item)}`;
      })
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function buildSummary(): FreshnessCronSummary {
  return {
    processedPostings: 0,
    createdPostings: 0,
    createdRuns: 0,
    createdTodos: 0,
    skippedAlreadyPlanned: 0
  };
}

function buildOrgSummary(): OrgSummary {
  return {
    ...buildSummary(),
    postingIds: [],
    createdPostingIds: [],
    runIds: [],
    todoIds: []
  };
}

export async function runFreshnessCron(): Promise<FreshnessCronSummary> {
  const pool = getPool();
  const client = await pool.connect();
  const summary = buildSummary();
  const orgSummaries = new Map<string, OrgSummary>();

  const getOrgSummary = (orgId: string): OrgSummary => {
    const existing = orgSummaries.get(orgId);
    if (existing) {
      return existing;
    }
    const next = buildOrgSummary();
    orgSummaries.set(orgId, next);
    return next;
  };

  try {
    await client.query("BEGIN");

    const staleResult = await client.query<StalePostingRow>(
      `WITH latest_postings AS (
         SELECT DISTINCT ON (jp.job_id)
                jp.id AS posting_id,
                jp.job_id,
                jp.last_published_at,
                jp.freshness_expires_at
         FROM job_postings AS jp
         WHERE jp.channel = $1
         ORDER BY jp.job_id, jp.created_at DESC NULLS LAST
       )
       SELECT lp.posting_id,
              lp.job_id,
              jobs.org_id,
              jobs.client_id,
              lp.last_published_at,
              lp.freshness_expires_at
       FROM latest_postings AS lp
       JOIN jobs ON jobs.id = lp.job_id
       WHERE (lp.last_published_at IS NOT NULL
              AND lp.last_published_at <= NOW() - INTERVAL '14 days')
          OR (lp.freshness_expires_at IS NOT NULL
              AND lp.freshness_expires_at <= NOW())`,
      ["airwork"]
    );

    const refreshItems: RefreshItem[] = [];

    for (const row of staleResult.rows) {
      summary.processedPostings += 1;
      const orgSummary = getOrgSummary(row.org_id);
      orgSummary.processedPostings += 1;
      orgSummary.postingIds.push(row.posting_id);

      await client.query(
        `UPDATE job_postings
         SET is_refresh_candidate = true,
             freshness_expires_at = CASE
               WHEN last_published_at IS NOT NULL
                AND (freshness_expires_at IS NULL OR freshness_expires_at > NOW())
               THEN last_published_at + INTERVAL '14 days'
               ELSE freshness_expires_at
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [row.posting_id]
      );

      const oldApprovedResult = await client.query<{
        payload_json: Record<string, unknown>;
      }>(
        `SELECT payload_json
         FROM job_revisions
         WHERE job_posting_id = $1 AND status = $2
         ORDER BY approved_at DESC NULLS LAST, rev_no DESC
         LIMIT 1`,
        [row.posting_id, "approved"]
      );

      const oldPayload = oldApprovedResult.rows[0]?.payload_json;

      const unpublishTodoId = await ensureTodo(client, {
        orgId: row.org_id,
        clientId: row.client_id,
        jobId: row.job_id,
        runId: null,
        type: "airwork_unpublish",
        title: "Unpublish stale job on Airwork",
        instructions:
          "1. Airwork 側で掲載終了の操作を行う。\n" +
          "2. 掲載終了の証跡を添付する。"
      });
      if (unpublishTodoId) {
        summary.createdTodos += 1;
        orgSummary.createdTodos += 1;
        orgSummary.todoIds.push(unpublishTodoId);
      }

      const republishTodoId = await ensureTodo(client, {
        orgId: row.org_id,
        clientId: row.client_id,
        jobId: row.job_id,
        runId: null,
        type: "airwork_republish",
        title: "Republish jobs if required",
        instructions:
          "1. 新規作成の入稿が完了したら再掲載を検討する。\n" +
          "2. 必要に応じて掲載再開の証跡を残す。"
      });
      if (republishTodoId) {
        summary.createdTodos += 1;
        orgSummary.createdTodos += 1;
        orgSummary.todoIds.push(republishTodoId);
      }

      if (!oldPayload) {
        summary.skippedAlreadyPlanned += 1;
        orgSummary.skippedAlreadyPlanned += 1;
        continue;
      }

      const existingPostingResult = await client.query<{
        id: string;
        created_at: string | null;
      }>(
        `SELECT id, created_at
         FROM job_postings
         WHERE job_id = $1
           AND channel = $2
           AND job_offer_id IS NULL
           AND id <> $3
         ORDER BY created_at DESC NULLS LAST
         LIMIT 1`,
        [row.job_id, "airwork", row.posting_id]
      );

      const existingPosting = existingPostingResult.rows[0];
      let refreshPostingId: string | null = null;

      if (existingPosting?.id) {
        const runItemResult = await client.query<{ id: number }>(
          `SELECT id FROM run_items WHERE job_posting_id = $1 LIMIT 1`,
          [existingPosting.id]
        );
        const hasRunItem = Boolean(runItemResult.rows[0]);
        const createdAt = existingPosting.created_at
          ? new Date(existingPosting.created_at)
          : null;
        const isRecent =
          createdAt !== null &&
          createdAt.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;

        if (hasRunItem) {
          summary.skippedAlreadyPlanned += 1;
          orgSummary.skippedAlreadyPlanned += 1;
          continue;
        }

        if (isRecent) {
          refreshPostingId = existingPosting.id;
        }
      }

      if (!refreshPostingId) {
        const insertPostingResult = await client.query<{ id: string }>(
          `INSERT INTO job_postings (job_id, channel, job_offer_id)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [row.job_id, "airwork", null]
        );
        refreshPostingId = insertPostingResult.rows[0]?.id ?? null;
        if (refreshPostingId) {
          summary.createdPostings += 1;
          orgSummary.createdPostings += 1;
          orgSummary.createdPostingIds.push(refreshPostingId);
        }
      }

      if (!refreshPostingId) {
        summary.skippedAlreadyPlanned += 1;
        orgSummary.skippedAlreadyPlanned += 1;
        continue;
      }

      const existingRevisionResult = await client.query<{ id: string }>(
        `SELECT id
         FROM job_revisions
         WHERE job_posting_id = $1 AND status = $2
         ORDER BY approved_at DESC NULLS LAST, rev_no DESC
         LIMIT 1`,
        [refreshPostingId, "approved"]
      );

      let refreshRevisionId = existingRevisionResult.rows[0]?.id ?? null;

      if (!refreshRevisionId) {
        const payloadHash = createHash("sha256")
          .update(stableStringify(oldPayload))
          .digest("hex");
        const insertRevisionResult = await client.query<{ id: string }>(
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
           FROM next_rev
           RETURNING id`,
          [refreshPostingId, "manual", "approved", oldPayload, payloadHash]
        );
        refreshRevisionId = insertRevisionResult.rows[0]?.id ?? null;
      }

      if (!refreshRevisionId) {
        summary.skippedAlreadyPlanned += 1;
        orgSummary.skippedAlreadyPlanned += 1;
        continue;
      }

      const runItemExists = await client.query<{ id: number }>(
        `SELECT id FROM run_items WHERE job_posting_id = $1 AND action = $2 LIMIT 1`,
        [refreshPostingId, "create"]
      );
      if (runItemExists.rows[0]) {
        summary.skippedAlreadyPlanned += 1;
        orgSummary.skippedAlreadyPlanned += 1;
        continue;
      }

      refreshItems.push({
        orgId: row.org_id,
        clientId: row.client_id,
        jobId: row.job_id,
        jobPostingId: refreshPostingId,
        jobRevisionId: refreshRevisionId
      });
    }

    const itemsByClient = new Map<string, RefreshItem[]>();
    for (const item of refreshItems) {
      const key = `${item.orgId}:${item.clientId}`;
      const existing = itemsByClient.get(key) ?? [];
      existing.push(item);
      itemsByClient.set(key, existing);
    }

    for (const [key, items] of itemsByClient.entries()) {
      const [orgId, clientId] = key.split(":");
      const orgSummary = getOrgSummary(orgId);

      const runResult = await client.query<{ id: number }>(
        `SELECT id
         FROM runs
         WHERE org_id = $1
           AND client_id = $2
           AND run_type = $3
           AND status = ANY($4)
           AND created_at >= date_trunc('day', NOW())
           AND created_at < date_trunc('day', NOW()) + INTERVAL '1 day'
         ORDER BY created_at DESC
         LIMIT 1`,
        [orgId, clientId, "refresh", ["draft", "file_generated", "executing"]]
      );

      let runId = runResult.rows[0]?.id ?? null;
      if (!runId) {
        const insertRunResult = await client.query<{ id: number }>(
          `INSERT INTO runs (org_id, client_id, run_type, status, file_format)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [orgId, clientId, "refresh", "draft", "xlsx"]
        );
        runId = insertRunResult.rows[0]?.id ?? null;
        if (runId) {
          summary.createdRuns += 1;
          orgSummary.createdRuns += 1;
          orgSummary.runIds.push(runId);
        }
      }

      if (!runId) {
        summary.skippedAlreadyPlanned += items.length;
        orgSummary.skippedAlreadyPlanned += items.length;
        continue;
      }

      for (const item of items) {
        const existingRunItem = await client.query<{ id: number }>(
          `SELECT id
           FROM run_items
           WHERE run_id = $1 AND job_posting_id = $2 AND action = $3
           LIMIT 1`,
          [runId, item.jobPostingId, "create"]
        );
        if (existingRunItem.rows[0]) {
          summary.skippedAlreadyPlanned += 1;
          orgSummary.skippedAlreadyPlanned += 1;
          continue;
        }

        await client.query(
          `INSERT INTO run_items (run_id, job_posting_id, job_revision_id, action)
           VALUES ($1, $2, $3, $4)`,
          [runId, item.jobPostingId, item.jobRevisionId, "create"]
        );
      }

      const uploadTodoId = await ensureTodo(client, {
        orgId,
        clientId,
        runId,
        jobId: null,
        type: "airwork_upload_file",
        title: "Upload refresh run file to Airwork",
        instructions:
          "1. リフレッシュ用の入稿ファイルを Airwork にアップロードする。\n" +
          "2. 受付完了の証跡を添付する。"
      });
      if (uploadTodoId) {
        summary.createdTodos += 1;
        orgSummary.createdTodos += 1;
        orgSummary.todoIds.push(uploadTodoId);
      }

      const downloadTodoId = await ensureTodo(client, {
        orgId,
        clientId,
        runId,
        jobId: null,
        type: "airwork_download_sync",
        title: "Download & sync newly created postings",
        instructions:
          "1. Airwork の結果ファイルをダウンロードする。\n" +
          "2. 新規作成分を Ensemble に同期する。\n" +
          "3. 証跡を添付する。"
      });
      if (downloadTodoId) {
        summary.createdTodos += 1;
        orgSummary.createdTodos += 1;
        orgSummary.todoIds.push(downloadTodoId);
      }

      if (items.length > 0) {
        const linkTodoId = await ensureTodo(client, {
          orgId,
          clientId,
          runId,
          jobId: null,
          type: "airwork_link_new_job_offer_id",
          title: "Link new job_offer_id after refresh",
          instructions:
            "1. Airwork 側で新規作成分の job_offer_id を確認する。\n" +
            "2. Ensemble の求人に紐付けて同期する。\n" +
            "3. 証跡を添付する。"
        });
        if (linkTodoId) {
          summary.createdTodos += 1;
          orgSummary.createdTodos += 1;
          orgSummary.todoIds.push(linkTodoId);
        }
      }
    }

    for (const [orgId, orgSummary] of orgSummaries.entries()) {
      await client.query(
        `INSERT INTO audit_logs (org_id, action, payload_json, created_by)
         VALUES ($1, $2, $3, $4)`,
        [
          orgId,
          "cron_freshness",
          {
            processed_postings: orgSummary.processedPostings,
            created_postings: orgSummary.createdPostings,
            created_runs: orgSummary.createdRuns,
            created_todos: orgSummary.createdTodos,
            skipped_already_planned: orgSummary.skippedAlreadyPlanned,
            posting_ids: orgSummary.postingIds,
            created_posting_ids: orgSummary.createdPostingIds,
            run_ids: orgSummary.runIds,
            todo_ids: orgSummary.todoIds
          },
          null
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return summary;
}

async function ensureTodo(
  client: PoolClient,
  params: {
    orgId: string;
    clientId: string;
    runId: number | null;
    jobId: string | null;
    type:
      | "airwork_unpublish"
      | "airwork_upload_file"
      | "airwork_republish"
      | "airwork_download_sync"
      | "airwork_link_new_job_offer_id";
    title: string;
    instructions?: string;
  }
): Promise<string | null> {
  const existing = await client.query<{ id: string }>(
    `SELECT id
     FROM todos
     WHERE org_id = $1
       AND type = $2
       AND client_id IS NOT DISTINCT FROM $3
       AND job_id IS NOT DISTINCT FROM $4
       AND run_id IS NOT DISTINCT FROM $5
       AND status NOT IN ($6, $7)
     LIMIT 1`,
    [
      params.orgId,
      params.type,
      params.clientId,
      params.jobId,
      params.runId,
      "done",
      "canceled"
    ]
  );

  if (existing.rows[0]) {
    return null;
  }

  const insertResult = await client.query<{ id: string }>(
    `INSERT INTO todos (
       org_id,
       status,
       type,
       title,
       instructions,
       evidence_urls,
       due_at,
       client_id,
       run_id,
       job_id,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, NOW(), NOW())
     RETURNING id`,
    [
      params.orgId,
      "open",
      params.type,
      params.title,
      params.instructions ?? null,
      JSON.stringify([]),
      null,
      params.clientId,
      params.runId,
      params.jobId
    ]
  );

  return insertResult.rows[0]?.id ?? null;
}
