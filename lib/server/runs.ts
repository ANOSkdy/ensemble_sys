import "server-only";

import { createHash } from "crypto";
import { getPool, query } from "@/lib/db";
import { isMissingTableError } from "@/lib/clients";

export type RunSummary = {
  id: number;
  clientId: string;
  clientName: string;
  runType: string;
  status: string;
  fileFormat: string | null;
  createdAt: string;
};

export type RunDetail = {
  id: number;
  clientId: string;
  clientName: string;
  runType: string;
  status: string;
  fileFormat: string | null;
  fileBlobUrl: string | null;
  fileSha256: string | null;
  createdAt: string;
  updatedAt: string | null;
  itemCount: number;
};

export type RunItemRecord = {
  id: number;
  action: "create" | "update";
  jobOfferId: string | null;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  payload: Record<string, string> | null;
  validationErrors: RunItemValidationError[] | null;
};

export type RunItemValidationError = {
  message: string;
  field_key?: string | null;
  row_number?: number | null;
  job_offer_id?: string | null;
  source_file?: string | null;
};

export type RunItemValidation = {
  errors: string[];
  warnings: string[];
};

export type RunValidationMasters = {
  locationIds: Set<string>;
  jobTypeCodes: Set<string>;
  hasJobTypeMaster: boolean;
};

export const BASE_AIRWORK_COLUMNS = [
  "job_offer_id",
  "working_location_id",
  "job_type",
  "title",
  "subtitle",
  "description"
];

const TITLE_MAX = 200;
const SUBTITLE_MAX = 200;
const DESCRIPTION_MAX = 10000;

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

export async function listRuns(orgId: string): Promise<RunSummary[]> {
  try {
    const result = await query<{
      id: number;
      client_id: string;
      client_name: string;
      run_type: string;
      status: string;
      file_format: string | null;
      created_at: string;
    }>(
      `SELECT runs.id,
              runs.client_id,
              clients.name AS client_name,
              runs.run_type,
              runs.status,
              runs.file_format,
              runs.created_at
       FROM runs
       JOIN clients ON clients.id = runs.client_id AND clients.org_id = runs.org_id
       WHERE runs.org_id = $1
       ORDER BY runs.created_at DESC`,
      [orgId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      runType: row.run_type,
      status: row.status,
      fileFormat: row.file_format,
      createdAt: row.created_at
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getRunDetail(
  orgId: string,
  runId: number
): Promise<RunDetail | null> {
  try {
    const result = await query<{
      id: number;
      client_id: string;
      client_name: string;
      run_type: string;
      status: string;
      file_format: string | null;
      file_blob_url: string | null;
      file_sha256: string | null;
      created_at: string;
      updated_at: string | null;
      item_count: string;
    }>(
      `SELECT runs.id,
              runs.client_id,
              clients.name AS client_name,
              runs.run_type,
              runs.status,
              runs.file_format,
              runs.file_blob_url,
              runs.file_sha256,
              runs.created_at,
              runs.updated_at,
              COALESCE(item_counts.item_count, 0) AS item_count
       FROM runs
       JOIN clients ON clients.id = runs.client_id AND clients.org_id = runs.org_id
       LEFT JOIN (
         SELECT run_id, COUNT(*) AS item_count
         FROM run_items
         GROUP BY run_id
       ) AS item_counts ON item_counts.run_id = runs.id
       WHERE runs.org_id = $1 AND runs.id = $2`,
      [orgId, runId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      runType: row.run_type,
      status: row.status,
      fileFormat: row.file_format,
      fileBlobUrl: row.file_blob_url,
      fileSha256: row.file_sha256,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      itemCount: Number(row.item_count ?? 0)
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function listRunItems(
  orgId: string,
  runId: number
): Promise<RunItemRecord[]> {
  try {
    const result = await query<{
      id: number;
      action: "create" | "update";
      job_offer_id: string | null;
      job_id: string;
      job_title: string;
      client_id: string;
      client_name: string;
      payload_json: Record<string, string> | null;
      validation_errors: RunItemValidationError[] | null;
    }>(
      `SELECT ri.id,
              ri.action,
              jp.job_offer_id,
              jobs.id AS job_id,
              jobs.internal_title AS job_title,
              clients.id AS client_id,
              clients.name AS client_name,
              jr.payload_json,
              ri.validation_errors
       FROM run_items AS ri
       JOIN runs ON runs.id = ri.run_id
       JOIN job_postings AS jp ON jp.id = ri.job_posting_id
       JOIN jobs ON jobs.id = jp.job_id
       JOIN clients ON clients.id = jobs.client_id AND clients.org_id = runs.org_id
       JOIN job_revisions AS jr ON jr.id = ri.job_revision_id
       WHERE runs.org_id = $1 AND runs.id = $2
       ORDER BY jobs.internal_title ASC`,
      [orgId, runId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      jobOfferId: row.job_offer_id,
      jobId: row.job_id,
      jobTitle: row.job_title,
      clientId: row.client_id,
      clientName: row.client_name,
      payload: row.payload_json,
      validationErrors: row.validation_errors ?? null
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getRunValidationMasters(
  orgId: string,
  clientId: string
): Promise<RunValidationMasters> {
  const [locationsResult, codesResult] = await Promise.all([
    query<{ working_location_id: string }>(
      `SELECT al.working_location_id
       FROM airwork_locations AS al
       JOIN clients AS c ON c.id = al.client_id
       WHERE c.org_id = $1 AND al.client_id = $2`,
      [orgId, clientId]
    ).catch((error) => {
      if (isMissingTableError(error)) {
        return { rows: [] } as { rows: { working_location_id: string }[] };
      }
      throw error;
    }),
    query<{ code: string }>(
      `SELECT code
       FROM airwork_codes
       WHERE field_key = $1 AND is_active = true`,
      ["job_type"]
    ).catch((error) => {
      if (isMissingTableError(error)) {
        return { rows: [] } as { rows: { code: string }[] };
      }
      throw error;
    })
  ]);

  return {
    locationIds: new Set(locationsResult.rows.map((row) => row.working_location_id)),
    jobTypeCodes: new Set(codesResult.rows.map((row) => row.code)),
    hasJobTypeMaster: codesResult.rows.length > 0
  };
}

export function validateRunItem(
  item: RunItemRecord,
  masters: RunValidationMasters
): RunItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const title = getPayloadValue(item.payload, "title");
  const subtitle = getPayloadValue(item.payload, "subtitle");
  const description = getPayloadValue(item.payload, "description");
  const workingLocationId = getPayloadValue(item.payload, "working_location_id");
  const jobType = getPayloadValue(item.payload, "job_type");
  const payloadJobOfferId = getPayloadValue(item.payload, "job_offer_id");
  const jobOfferId = payloadJobOfferId ?? item.jobOfferId ?? null;

  if (item.action === "update" && !jobOfferId) {
    errors.push("job_offer_id が未設定です。");
  }

  if (!title) {
    errors.push("title が未設定です。");
  } else if (title.length > TITLE_MAX) {
    errors.push(`title は ${TITLE_MAX} 文字以内で入力してください。`);
  }

  if (!description) {
    errors.push("description が未設定です。");
  } else if (description.length > DESCRIPTION_MAX) {
    errors.push(`description は ${DESCRIPTION_MAX} 文字以内で入力してください。`);
  }

  if (subtitle && subtitle.length > SUBTITLE_MAX) {
    errors.push(`subtitle は ${SUBTITLE_MAX} 文字以内で入力してください。`);
  }

  if (workingLocationId && !masters.locationIds.has(workingLocationId)) {
    errors.push("working_location_id がマスタに存在しません。");
  }

  if (jobType && masters.hasJobTypeMaster && !masters.jobTypeCodes.has(jobType)) {
    errors.push("job_type がマスタに存在しません。");
  }

  if (!subtitle) {
    warnings.push("subtitle が未入力です。");
  }

  if (!workingLocationId) {
    warnings.push("working_location_id が未入力です。");
  }

  if (!jobType) {
    warnings.push("job_type が未入力です。");
  }

  return { errors, warnings };
}

export async function listAirworkFieldKeys(): Promise<string[]> {
  try {
    const result = await query<{ field_key: string }>(
      `SELECT field_key
       FROM airwork_fields
       ORDER BY sort_order ASC, field_key ASC`
    );
    return result.rows.map((row) => row.field_key);
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export function buildAirworkColumns(
  items: RunItemRecord[],
  fieldKeys: string[]
): string[] {
  const presentKeys = new Set<string>();
  items.forEach((item) => {
    if (!item.payload) {
      return;
    }
    Object.keys(item.payload).forEach((key) => {
      presentKeys.add(key);
    });
  });

  const extraKeys = fieldKeys.filter(
    (key) => !BASE_AIRWORK_COLUMNS.includes(key) && presentKeys.has(key)
  );

  return [...BASE_AIRWORK_COLUMNS, ...extraKeys];
}

export function buildRunRow(item: RunItemRecord, columns: string[]): string[] {
  const payload = item.payload;
  const payloadJobOfferId = getPayloadValue(payload, "job_offer_id");
  const jobOfferId = payloadJobOfferId ?? item.jobOfferId ?? "";

  return columns.map((column) => {
    if (column === "job_offer_id") {
      return jobOfferId;
    }
    const value = getPayloadValue(payload, column);
    return value ?? "";
  });
}

export function buildRunSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function createRunWithItems(options: {
  orgId: string;
  clientId: string;
  runType: "update" | "refresh";
  fileFormat: "xlsx" | "txt";
  includeLatestApprovedOnly: boolean;
}): Promise<{ runId: number; itemCount: number }> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runResult = await client.query<{ id: number }>(
      `INSERT INTO runs (org_id, client_id, run_type, status, file_format)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [options.orgId, options.clientId, options.runType, "draft", options.fileFormat]
    );

    const runId = runResult.rows[0]?.id;
    if (!runId) {
      throw new Error("RUN_INSERT_FAILED");
    }

    const postingsResult = await client.query<{
      job_posting_id: string;
      job_offer_id: string | null;
      approved_revision_id: string;
    }>(
      `WITH postings AS (
         SELECT jobs.id AS job_id,
                posting.id AS job_posting_id,
                posting.job_offer_id
         FROM jobs
         JOIN LATERAL (
           SELECT id, job_offer_id
           FROM job_postings
           WHERE job_postings.job_id = jobs.id AND job_postings.channel = $3
           ORDER BY job_postings.created_at DESC NULLS LAST
           LIMIT 1
         ) AS posting ON true
         WHERE jobs.org_id = $1 AND jobs.client_id = $2
       ),
       approved AS (
         SELECT DISTINCT ON (jr.job_posting_id)
                jr.job_posting_id,
                jr.id AS approved_revision_id,
                jr.rev_no
         FROM job_revisions AS jr
         JOIN postings ON postings.job_posting_id = jr.job_posting_id
         WHERE jr.status = $4
         ORDER BY jr.job_posting_id, jr.approved_at DESC NULLS LAST, jr.rev_no DESC
       ),
       latest_rev AS (
         SELECT jr.job_posting_id, MAX(jr.rev_no) AS latest_rev_no
         FROM job_revisions AS jr
         JOIN postings ON postings.job_posting_id = jr.job_posting_id
         GROUP BY jr.job_posting_id
       )
       SELECT postings.job_posting_id,
              postings.job_offer_id,
              approved.approved_revision_id
       FROM postings
       JOIN approved ON approved.job_posting_id = postings.job_posting_id
       JOIN latest_rev ON latest_rev.job_posting_id = postings.job_posting_id
       WHERE ($5 = false OR approved.rev_no = latest_rev.latest_rev_no)`,
      [options.orgId, options.clientId, "airwork", "approved", options.includeLatestApprovedOnly]
    );

    let itemCount = 0;
    for (const row of postingsResult.rows) {
      const action = row.job_offer_id ? "update" : "create";
      await client.query(
        `INSERT INTO run_items (run_id, job_posting_id, job_revision_id, action)
         VALUES ($1, $2, $3, $4)`,
        [runId, row.job_posting_id, row.approved_revision_id, action]
      );
      itemCount += 1;
    }

    await client.query("COMMIT");
    return { runId, itemCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
