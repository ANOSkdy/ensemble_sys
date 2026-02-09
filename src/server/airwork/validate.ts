import "server-only";

import { getPool, query } from "@/lib/db";
import { isMissingTableError } from "@/lib/clients";
import {
  getImportedValidationErrors,
  type RunItemPreflightIssue,
  type RunItemValidationError,
  type RunItemValidationStored,
  type RunItemValidationSummary
} from "@/lib/server/runs";

type RunItemValidationResult = {
  runItemId: number;
  hardErrors: RunItemPreflightIssue[];
  warnings: RunItemPreflightIssue[];
  importedErrors: RunItemValidationError[];
};

export type RunValidationSummary = {
  items: RunItemValidationResult[];
  hardErrorCount: number;
  warningCount: number;
};

const TITLE_MAX = 200;
const SUBTITLE_MAX = 200;
const DESCRIPTION_MAX = 10000;
const NEAR_LIMIT_RATIO = 0.9;

const TITLE_WARN = Math.floor(TITLE_MAX * NEAR_LIMIT_RATIO);
const SUBTITLE_WARN = Math.floor(SUBTITLE_MAX * NEAR_LIMIT_RATIO);
const DESCRIPTION_WARN = Math.floor(DESCRIPTION_MAX * NEAR_LIMIT_RATIO);

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

function buildStoredValidation(
  existing: RunItemValidationStored | null,
  hardErrors: RunItemPreflightIssue[],
  warnings: RunItemPreflightIssue[]
): RunItemValidationSummary {
  const imported = getImportedValidationErrors(existing);
  return {
    hardErrors,
    warnings,
    imported: imported.length > 0 ? imported : undefined
  };
}

export async function validateRunItems(
  orgId: string,
  runId: number
): Promise<RunValidationSummary> {
  const runResult = await query<{ id: number; client_id: string }>(
    `SELECT id, client_id
     FROM runs
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [orgId, runId]
  );
  const run = runResult.rows[0];
  if (!run) {
    throw new Error("RUN_NOT_FOUND");
  }

  const itemsResult = await query<{
    id: number;
    action: "create" | "update";
    job_offer_id: string | null;
    payload_json: Record<string, string> | null;
    validation_errors: RunItemValidationStored | null;
  }>(
    `SELECT ri.id,
            ri.action,
            jp.job_offer_id,
            jr.payload_json,
            ri.validation_errors
     FROM run_items AS ri
     JOIN runs ON runs.id = ri.run_id
     JOIN job_postings AS jp ON jp.id = ri.job_posting_id
     JOIN job_revisions AS jr ON jr.id = ri.job_revision_id
     WHERE runs.org_id = $1 AND runs.id = $2
     ORDER BY ri.id ASC`,
    [orgId, runId]
  );

  const [locationsResult, codesResult, fieldsResult] = await Promise.all([
    query<{ working_location_id: string }>(
      `SELECT al.working_location_id
       FROM airwork_locations AS al
       JOIN clients AS c ON c.id = al.client_id
       WHERE c.org_id = $1 AND al.client_id = $2`,
      [orgId, run.client_id]
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
    }),
    query<{ field_key: string }>(
      `SELECT field_key
       FROM airwork_fields`
    ).catch((error) => {
      if (isMissingTableError(error)) {
        return { rows: [] } as { rows: { field_key: string }[] };
      }
      throw error;
    })
  ]);

  const locationIds = new Set(
    locationsResult.rows.map((row) => row.working_location_id)
  );
  const jobTypeCodes = new Set(codesResult.rows.map((row) => row.code));
  const hasJobTypeMaster = codesResult.rows.length > 0;
  const fieldKeySet = new Set(fieldsResult.rows.map((row) => row.field_key));
  const hasFieldKeys = fieldKeySet.size > 0;

  const results: RunItemValidationResult[] = [];
  const resultsById = new Map<number, RunItemValidationResult>();
  let hardErrorCount = 0;
  let warningCount = 0;

  for (const item of itemsResult.rows) {
    const hardErrors: RunItemPreflightIssue[] = [];
    const warnings: RunItemPreflightIssue[] = [];

    const title = getPayloadValue(item.payload_json, "title");
    const subtitle = getPayloadValue(item.payload_json, "subtitle");
    const description = getPayloadValue(item.payload_json, "description");
    const workingLocationId = getPayloadValue(
      item.payload_json,
      "working_location_id"
    );
    const jobType = getPayloadValue(item.payload_json, "job_type");
    const payloadJobOfferId = getPayloadValue(item.payload_json, "job_offer_id");
    const jobOfferId = payloadJobOfferId ?? item.job_offer_id ?? null;

    if (item.action === "update" && !jobOfferId) {
      hardErrors.push({
        code: "required_job_offer_id",
        message: "job_offer_id が未設定です。",
        field_key: "job_offer_id"
      });
    }

    if (!title || title.trim().length === 0) {
      hardErrors.push({
        code: "required_title",
        message: "title が未設定です。",
        field_key: "title"
      });
    } else if (title.length > TITLE_MAX) {
      hardErrors.push({
        code: "length_title",
        message: `title は ${TITLE_MAX} 文字以内で入力してください。`,
        field_key: "title"
      });
    } else if (title.length >= TITLE_WARN) {
      warnings.push({
        code: "near_limit_title",
        message: `title が上限（${TITLE_MAX}文字）に近づいています。`,
        field_key: "title",
        detail: `${title.length}/${TITLE_MAX}`
      });
    }

    if (!description || description.trim().length === 0) {
      hardErrors.push({
        code: "required_description",
        message: "description が未設定です。",
        field_key: "description"
      });
    } else if (description.length > DESCRIPTION_MAX) {
      hardErrors.push({
        code: "length_description",
        message: `description は ${DESCRIPTION_MAX} 文字以内で入力してください。`,
        field_key: "description"
      });
    } else if (description.length >= DESCRIPTION_WARN) {
      warnings.push({
        code: "near_limit_description",
        message: `description が上限（${DESCRIPTION_MAX}文字）に近づいています。`,
        field_key: "description",
        detail: `${description.length}/${DESCRIPTION_MAX}`
      });
    }

    if (subtitle) {
      if (subtitle.length > SUBTITLE_MAX) {
        hardErrors.push({
          code: "length_subtitle",
          message: `subtitle は ${SUBTITLE_MAX} 文字以内で入力してください。`,
          field_key: "subtitle"
        });
      } else if (subtitle.length >= SUBTITLE_WARN) {
        warnings.push({
          code: "near_limit_subtitle",
          message: `subtitle が上限（${SUBTITLE_MAX}文字）に近づいています。`,
          field_key: "subtitle",
          detail: `${subtitle.length}/${SUBTITLE_MAX}`
        });
      }
    }

    if (workingLocationId && !locationIds.has(workingLocationId)) {
      hardErrors.push({
        code: "invalid_working_location",
        message: "working_location_id がマスタに存在しません。",
        field_key: "working_location_id"
      });
    }

    if (jobType && hasJobTypeMaster && !jobTypeCodes.has(jobType)) {
      hardErrors.push({
        code: "invalid_job_type",
        message: "job_type がマスタに存在しません。",
        field_key: "job_type"
      });
    }

    if (hasFieldKeys && item.payload_json) {
      Object.keys(item.payload_json).forEach((key) => {
        if (!fieldKeySet.has(key)) {
          warnings.push({
            code: "unknown_field_key",
            message: `未知の項目が含まれています: ${key}`,
            field_key: key
          });
        }
      });
    }

    const importedErrors = getImportedValidationErrors(item.validation_errors);
    const result: RunItemValidationResult = {
      runItemId: item.id,
      hardErrors,
      warnings,
      importedErrors
    };
    results.push(result);
    resultsById.set(item.id, result);
    hardErrorCount += hardErrors.length;
    warningCount += warnings.length;
  }

  if (itemsResult.rows.length > 0) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const item of itemsResult.rows) {
        const result = resultsById.get(item.id);
        if (!result) {
          continue;
        }
        const stored = buildStoredValidation(
          item.validation_errors,
          result.hardErrors,
          result.warnings
        );
        await client.query(
          `UPDATE run_items
           SET validation_errors = $2::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [item.id, JSON.stringify(stored)]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return { items: results, hardErrorCount, warningCount };
}
