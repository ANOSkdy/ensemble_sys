import "server-only";

import ExcelJS from "exceljs";
import { getPool, query } from "@/lib/db";
import { uploadRunFile } from "@/lib/server/blob";
import { extractZipEntries } from "@/lib/server/zip";
import { createTodo } from "@/lib/todos";

type AirworkExportRow = Record<string, string | null>;

export type AirworkResultError = {
  message: string;
  field_key?: string | null;
  row_number?: number | null;
  job_offer_id?: string | null;
  source_file?: string | null;
};

export type AirworkExportSummary = {
  matched: number;
  updated: number;
  unmatched: number;
  blobUrl: string | null;
};

export type AirworkResultSummary = {
  errorCount: number;
  blobUrl: string | null;
};

const HEADER_ALIASES: Record<string, string> = {
  "求人番号": "job_offer_id",
  job_offer_id: "job_offer_id",
  "job offer id": "job_offer_id",
  "掲載ステータス": "publish_status_cache",
  publish_status: "publish_status_cache",
  publish_status_cache: "publish_status_cache",
  last_published_at: "last_published_at",
  "最終掲載日": "last_published_at",
  freshness_expires_at: "freshness_expires_at",
  "掲載期限": "freshness_expires_at",
  title: "title",
  "求人タイトル": "title",
  working_location_id: "working_location_id",
  "勤務地ID": "working_location_id"
};

const RESULT_MESSAGE_HEADERS = [
  "error",
  "errors",
  "message",
  "reason",
  "エラー内容",
  "エラー"
];

const RESULT_ROW_HEADERS = ["row", "row_number", "行番号", "行"];
const RESULT_FIELD_HEADERS = ["field_key", "field", "item", "項目", "項目名"];
const RESULT_JOB_OFFER_HEADERS = ["job_offer_id", "求人番号", "job_offer"];

function normalizeHeader(value: string, index: number): string {
  const trimmed = value.trim();
  const withoutBom = index === 0 ? trimmed.replace(/^\uFEFF/, "") : trimmed;
  const lower = withoutBom.toLowerCase();
  return HEADER_ALIASES[lower] ?? HEADER_ALIASES[withoutBom] ?? lower;
}

function stringifyCell(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }
    if ("result" in value && value.result != null) {
      return String(value.result);
    }
  }
  return "";
}

function parseDelimitedText(text: string, delimiter: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => line.split(delimiter));
}

async function parseXlsx(buffer: Buffer): Promise<AirworkExportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const rows: AirworkExportRow[] = [];
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  for (let col = 1; col <= headerRow.cellCount; col += 1) {
    const cellValue = headerRow.getCell(col).value;
    const raw = cellValue == null ? "" : String(cellValue);
    headers.push(normalizeHeader(raw, col - 1));
  }

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = headers.map((_, index) => {
      const cellValue = row.getCell(index + 1).value;
      const text = stringifyCell(cellValue).trim();
      return text.length > 0 ? text : null;
    });

    if (values.every((value) => value === null)) {
      continue;
    }

    const record: AirworkExportRow = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      record[header] = values[index] ?? null;
    });
    rows.push(record);
  }

  return rows;
}

function parseTsv(buffer: Buffer): AirworkExportRow[] {
  const text = new TextDecoder("utf-8").decode(buffer);
  const rows = parseDelimitedText(text, "\t");
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value, index) => normalizeHeader(value, index));
  return rows.slice(1).map((row) => {
    const record: AirworkExportRow = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      const value = row[index]?.trim();
      record[header] = value && value.length > 0 ? value : null;
    });
    return record;
  });
}

function getValue(row: AirworkExportRow, key: string): string | null {
  const value = row[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function parseDateValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function buildFingerprint(title: string, workingLocationId: string): string {
  return `${title.trim()}::${workingLocationId.trim()}`.toLowerCase();
}

async function uploadImportFile(
  runId: number,
  name: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const fileName = `runs/${runId}/imports/${Date.now()}-${name}`;
  const result = await uploadRunFile(fileName, buffer, contentType);
  return result.url;
}

export async function importAirworkExport(params: {
  orgId: string;
  runId: number;
  userId: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<AirworkExportSummary> {
  const runResult = await query<{ id: number; client_id: string }>(
    `SELECT id, client_id FROM runs WHERE org_id = $1 AND id = $2 LIMIT 1`,
    [params.orgId, params.runId]
  );
  const run = runResult.rows[0];
  if (!run) {
    throw new Error("RUN_NOT_FOUND");
  }

  const ext = params.fileName.toLowerCase();
  const rows = ext.endsWith(".xlsx")
    ? await parseXlsx(params.buffer)
    : parseTsv(params.buffer);

  const mappingResult = await query<{
    job_posting_id: string;
    job_offer_id: string | null;
    payload_json: Record<string, string> | null;
  }>(
    `SELECT jp.id AS job_posting_id,
            jp.job_offer_id,
            jr.payload_json
     FROM job_postings AS jp
     JOIN jobs ON jobs.id = jp.job_id
     JOIN LATERAL (
       SELECT payload_json
       FROM job_revisions
       WHERE job_posting_id = jp.id AND status = $3
       ORDER BY approved_at DESC NULLS LAST, rev_no DESC
       LIMIT 1
     ) AS jr ON true
     WHERE jobs.org_id = $1 AND jobs.client_id = $2 AND jp.channel = $4`,
    [params.orgId, run.client_id, "approved", "airwork"]
  );

  const jobOfferMap = new Map<string, string>();
  const fingerprintMap = new Map<string, string>();

  for (const posting of mappingResult.rows) {
    if (posting.job_offer_id) {
      jobOfferMap.set(posting.job_offer_id, posting.job_posting_id);
    }
    const title = posting.payload_json?.title;
    const workingLocationId = posting.payload_json?.working_location_id;
    if (title && workingLocationId) {
      fingerprintMap.set(
        buildFingerprint(title, workingLocationId),
        posting.job_posting_id
      );
    }
  }

  const client = await getPool().connect();
  let matched = 0;
  let updated = 0;
  let unmatched = 0;
  const blobUrl = await uploadImportFile(
    params.runId,
    params.fileName,
    params.buffer,
    params.contentType
  );

  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const jobOfferId = getValue(row, "job_offer_id");
      const title = getValue(row, "title");
      const workingLocationId = getValue(row, "working_location_id");
      const publishStatus = getValue(row, "publish_status_cache");
      const lastPublishedAt = parseDateValue(getValue(row, "last_published_at"));
      const freshnessExpiresAt = parseDateValue(getValue(row, "freshness_expires_at"));

      let postingId: string | undefined;
      if (jobOfferId && jobOfferMap.has(jobOfferId)) {
        postingId = jobOfferMap.get(jobOfferId);
      } else if (title && workingLocationId) {
        postingId = fingerprintMap.get(buildFingerprint(title, workingLocationId));
      }

      if (!postingId) {
        unmatched += 1;
        continue;
      }

      matched += 1;
      const result = await client.query(
        `UPDATE job_postings
         SET job_offer_id = COALESCE(job_offer_id, $2),
             publish_status_cache = COALESCE($3, publish_status_cache),
             last_published_at = COALESCE($4, last_published_at),
             freshness_expires_at = COALESCE($5, freshness_expires_at),
             updated_at = NOW()
         WHERE id = $1`,
        [
          postingId,
          jobOfferId,
          publishStatus,
          lastPublishedAt,
          freshnessExpiresAt
        ]
      );
      updated += result.rowCount ?? 0;
    }

    await client.query(
      `INSERT INTO audit_logs (org_id, action, payload_json, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        params.orgId,
        "import_airwork_export",
        {
          run_id: params.runId,
          file_name: params.fileName,
          blob_url: blobUrl,
          matched,
          updated,
          unmatched
        },
        params.userId
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await ensureLinkJobOfferTodo(params.orgId, run.client_id, params.runId);

  return { matched, updated, unmatched, blobUrl };
}

function detectDelimiter(lines: string[]): string {
  const firstLine = lines.find((line) => line.trim().length > 0) ?? "";
  return firstLine.includes("\t") ? "\t" : ",";
}

function parseResultText(text: string, sourceFile?: string): AirworkResultError[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines);
  const rows = parseDelimitedText(text, delimiter);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value, index) => normalizeHeader(value, index));
  const messageIndex = headers.findIndex((header) =>
    RESULT_MESSAGE_HEADERS.includes(header)
  );
  const rowIndex = headers.findIndex((header) => RESULT_ROW_HEADERS.includes(header));
  const fieldIndex = headers.findIndex((header) =>
    RESULT_FIELD_HEADERS.includes(header)
  );
  const jobOfferIndex = headers.findIndex((header) =>
    RESULT_JOB_OFFER_HEADERS.includes(header)
  );

  if (messageIndex === -1) {
    return rows.slice(1).map((row, index) => ({
      message: row.join(delimiter).trim(),
      row_number: index + 2,
      source_file: sourceFile ?? null
    }));
  }

  const errors: AirworkResultError[] = [];

  rows.slice(1).forEach((row, index) => {
    const message = row[messageIndex]?.trim() ?? "";
    if (!message) {
      return;
    }

    const fieldKey = fieldIndex >= 0 ? row[fieldIndex]?.trim() ?? null : null;
    const rowNumberRaw = rowIndex >= 0 ? row[rowIndex]?.trim() ?? null : null;
    const rowNumber = rowNumberRaw ? Number(rowNumberRaw) : null;
    const jobOfferId =
      jobOfferIndex >= 0 ? row[jobOfferIndex]?.trim() ?? null : null;

    errors.push({
      message,
      field_key: fieldKey && fieldKey.length > 0 ? fieldKey : null,
      row_number: Number.isFinite(rowNumber) ? rowNumber : null,
      job_offer_id: jobOfferId && jobOfferId.length > 0 ? jobOfferId : null,
      source_file: sourceFile ?? null
    });
  });

  return errors;
}

async function ensureLinkJobOfferTodo(
  orgId: string,
  clientId: string,
  runId: number
) {
  const missingResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM run_items AS ri
     JOIN job_postings AS jp ON jp.id = ri.job_posting_id
     JOIN runs ON runs.id = ri.run_id
     WHERE ri.run_id = $1 AND ri.action = $2 AND jp.job_offer_id IS NULL`,
    [runId, "create"]
  );
  const missingCount = Number(missingResult.rows[0]?.count ?? 0);
  if (missingCount === 0) {
    return;
  }

  const existing = await query<{ id: string }>(
    `SELECT id FROM todos
     WHERE org_id = $1 AND run_id = $2 AND type = $3
     LIMIT 1`,
    [orgId, runId, "link_new_job_offer_id"]
  );
  if (existing.rows[0]) {
    return;
  }

  await createTodo(orgId, {
    title: "Link new job_offer_id to Ensemble",
    type: "link_new_job_offer_id",
    status: "open",
    clientId,
    runId,
    instructions:
      "1. Airワーク側で新規作成分の job_offer_id を確認する。\n" +
      "2. Ensemble の求人に紐付けて同期する。\n" +
      "3. 証跡を添付して完了にする。"
  }).catch((error) => {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return;
    }
    throw error;
  });
}

export async function importAirworkResults(params: {
  orgId: string;
  runId: number;
  userId: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<AirworkResultSummary> {
  const runResult = await query<{ id: number; client_id: string }>(
    `SELECT id, client_id FROM runs WHERE org_id = $1 AND id = $2 LIMIT 1`,
    [params.orgId, params.runId]
  );
  const run = runResult.rows[0];
  if (!run) {
    throw new Error("RUN_NOT_FOUND");
  }

  const blobUrl = await uploadImportFile(
    params.runId,
    params.fileName,
    params.buffer,
    params.contentType
  );

  const errors: AirworkResultError[] = [];
  const lowerName = params.fileName.toLowerCase();
  if (lowerName.endsWith(".zip")) {
    const entries = extractZipEntries(params.buffer);
    for (const entry of entries) {
      if (!entry.name.toLowerCase().endsWith(".txt")) {
        continue;
      }
      const text = new TextDecoder("utf-8").decode(entry.data);
      errors.push(...parseResultText(text, entry.name));
    }
  } else {
    const text = new TextDecoder("utf-8").decode(params.buffer);
    errors.push(...parseResultText(text, params.fileName));
  }

  const runItemsResult = await query<{
    id: number;
    job_offer_id: string | null;
  }>(
    `SELECT ri.id,
            jp.job_offer_id
     FROM run_items AS ri
     JOIN job_postings AS jp ON jp.id = ri.job_posting_id
     WHERE ri.run_id = $1
     ORDER BY ri.id ASC`,
    [params.runId]
  );

  const runItems = runItemsResult.rows;
  const runItemByJobOfferId = new Map<string, number>();
  runItems.forEach((item) => {
    if (item.job_offer_id) {
      runItemByJobOfferId.set(item.job_offer_id, item.id);
    }
  });

  const errorMap = new Map<number, AirworkResultError[]>();
  errors.forEach((error, index) => {
    let runItemId: number | undefined;
    if (error.job_offer_id && runItemByJobOfferId.has(error.job_offer_id)) {
      runItemId = runItemByJobOfferId.get(error.job_offer_id);
    } else if (error.row_number) {
      const runItem = runItems[error.row_number - 1];
      runItemId = runItem?.id;
    } else {
      runItemId = runItems[index]?.id;
    }

    if (!runItemId) {
      return;
    }

    const list = errorMap.get(runItemId) ?? [];
    list.push(error);
    errorMap.set(runItemId, list);
  });

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE run_items SET validation_errors = NULL WHERE run_id = $1`, [
      params.runId
    ]);

    for (const [runItemId, itemErrors] of errorMap.entries()) {
      await client.query(
        `UPDATE run_items
         SET validation_errors = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [runItemId, JSON.stringify(itemErrors)]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (org_id, action, payload_json, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        params.orgId,
        "import_airwork_results",
        {
          run_id: params.runId,
          file_name: params.fileName,
          blob_url: blobUrl,
          error_count: errors.length
        },
        params.userId
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (errors.length > 0) {
    await ensureErrorTodo(params.orgId, run.client_id, params.runId);
  }

  return { errorCount: errors.length, blobUrl };
}

async function ensureErrorTodo(orgId: string, clientId: string, runId: number) {
  const existing = await query<{ id: string }>(
    `SELECT id FROM todos
     WHERE org_id = $1 AND run_id = $2 AND type = $3
     LIMIT 1`,
    [orgId, runId, "download_sync"]
  );
  if (existing.rows[0]) {
    return;
  }

  await createTodo(orgId, {
    title: "Fix run errors",
    type: "download_sync",
    status: "open",
    clientId,
    runId,
    instructions:
      "1. Airワークの結果ファイルを確認する。\n" +
      "2. エラー内容を修正し、再入稿または更新する。\n" +
      "3. 修正内容を証跡として残す。"
  }).catch((error) => {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return;
    }
    throw error;
  });
}
