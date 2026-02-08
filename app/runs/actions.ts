"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasDatabaseUrl, query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { isMissingTableError } from "@/lib/clients";
import {
  buildAirworkColumns,
  buildRunRow,
  buildRunSha256,
  createRunWithItems,
  getRunDetail,
  getRunValidationMasters,
  listAirworkFieldKeys,
  listRunItems,
  validateRunItem
} from "@/lib/server/runs";
import { uploadRunFile } from "@/lib/server/blob";

export type RunFormState = {
  ok: boolean;
  message?: string;
  runId?: number;
};

export type RunActionState = {
  ok: boolean;
  message?: string;
};

const runFormSchema = z.object({
  clientId: z.string().uuid(),
  runType: z.enum(["update", "refresh"]).default("update"),
  fileFormat: z.enum(["xlsx", "txt"]).default("xlsx"),
  includeLatestApprovedOnly: z.boolean().default(true)
});

const runIdSchema = z.coerce.number().int().positive();

export async function createRunAction(
  _prevState: RunFormState,
  formData: FormData
): Promise<RunFormState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsed = runFormSchema.safeParse({
    clientId: formData.get("client_id"),
    runType: formData.get("run_type"),
    fileFormat: formData.get("file_format"),
    includeLatestApprovedOnly: formData.get("include_latest_approved_only") !== null
  });

  if (!parsed.success) {
    return { ok: false, message: "入力内容を確認してください。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  try {
    const { runId, itemCount } = await createRunWithItems({
      orgId: user.orgId,
      clientId: parsed.data.clientId,
      runType: parsed.data.runType,
      fileFormat: parsed.data.fileFormat,
      includeLatestApprovedOnly: parsed.data.includeLatestApprovedOnly
    });

    revalidatePath("/runs");
    revalidatePath("/");

    return {
      ok: true,
      message: `Runを作成しました（対象 ${itemCount} 件）。`,
      runId
    };
  } catch (error) {
    if (error instanceof Error && error.message === "RUN_INSERT_FAILED") {
      return { ok: false, message: "Runの作成に失敗しました。" };
    }
    if (isMissingTableError(error)) {
      return {
        ok: false,
        message: "Runs テーブルが見つかりません。migrate を実行してください。"
      };
    }
    return { ok: false, message: "Runの作成に失敗しました。" };
  }
}

export async function generateRunFileAction(
  runId: number,
  _prevState: RunActionState,
  _formData: FormData
): Promise<RunActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedRunId = runIdSchema.safeParse(runId);
  if (!parsedRunId.success) {
    return { ok: false, message: "Run ID が不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const run = await getRunDetail(user.orgId, parsedRunId.data);
  if (!run) {
    return { ok: false, message: "Run が見つかりません。" };
  }

  const items = await listRunItems(user.orgId, parsedRunId.data);
  if (items.length === 0) {
    return { ok: false, message: "対象求人がありません。" };
  }

  const masters = await getRunValidationMasters(user.orgId, run.clientId);
  const validationResults = items.map((item) => validateRunItem(item, masters));
  const hasErrors = validationResults.some((result) => result.errors.length > 0);
  if (hasErrors) {
    return {
      ok: false,
      message: "バリデーションエラーがあります。プレビューで確認してください。"
    };
  }

  const fieldKeys = await listAirworkFieldKeys();
  const columns = buildAirworkColumns(items, fieldKeys);
  const rows = items.map((item) => buildRunRow(item, columns));

  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  const format = run.fileFormat ?? "xlsx";

  if (format === "txt") {
    const header = columns.join("\t");
    const body = rows
      .map((row) =>
        row
          .map((cell) => cell.replaceAll("\t", " ").replaceAll("\n", " "))
          .join("\t")
      )
      .join("\n");
    buffer = Buffer.from(`${header}\n${body}\n`, "utf-8");
    contentType = "text/tab-separated-values; charset=utf-8";
    extension = "txt";
  } else {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("airwork");
    worksheet.addRow(columns);
    rows.forEach((row) => {
      const worksheetRow = worksheet.addRow(row);
      worksheetRow.eachCell((cell) => {
        cell.numFmt = "@";
      });
    });
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    const output = await workbook.xlsx.writeBuffer();
    buffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
    contentType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    extension = "xlsx";
  }

  const sha256 = buildRunSha256(buffer);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `runs/run-${run.id}-${timestamp}.${extension}`;
  const blob = await uploadRunFile(filename, buffer, contentType);

  await query(
    `UPDATE runs
     SET file_blob_url = $3,
         file_sha256 = $4,
         status = $5,
         updated_at = NOW()
     WHERE id = $1 AND org_id = $2`,
    [run.id, user.orgId, blob.url, sha256, "file_generated"]
  );

  revalidatePath(`/runs/${run.id}`);
  revalidatePath(`/runs/${run.id}/preview`);

  return { ok: true, message: "ファイルを生成しました。" };
}

export async function updateRunStatusAction(
  runId: number,
  status: "executing" | "done" | "failed",
  _prevState: RunActionState,
  _formData: FormData
): Promise<RunActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedRunId = runIdSchema.safeParse(runId);
  if (!parsedRunId.success) {
    return { ok: false, message: "Run ID が不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  await query(
    `UPDATE runs
     SET status = $3,
         updated_at = NOW()
     WHERE id = $1 AND org_id = $2`,
    [parsedRunId.data, user.orgId, status]
  );

  revalidatePath(`/runs/${parsedRunId.data}`);
  revalidatePath("/runs");

  return { ok: true, message: "ステータスを更新しました。" };
}
