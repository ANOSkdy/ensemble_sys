import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { importAirworkResults } from "@/lib/server/airwork-import";

export const runtime = "nodejs";

const runIdSchema = z.coerce.number().int().positive();
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".txt", ".zip"];

function redirectWithMessage(
  runId: number | null,
  status: "success" | "error",
  message: string
) {
  const path = runId ? `/runs/${runId}/import` : "/runs";
  const url = new URL(path, "http://localhost");
  url.searchParams.set("section", "results");
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  if (!hasDatabaseUrl()) {
    return redirectWithMessage(null, "error", "DATABASE_URL が未設定です。");
  }

  const parsedRunId = runIdSchema.safeParse(params.runId);
  if (!parsedRunId.success) {
    return redirectWithMessage(null, "error", "Run ID が不正です。");
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return redirectWithMessage(parsedRunId.data, "error", "ログインが必要です。");
  }

  if (user.orgId === null) {
    return redirectWithMessage(parsedRunId.data, "error", "組織情報が見つかりません。");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirectWithMessage(parsedRunId.data, "error", "フォーム解析に失敗しました。");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return redirectWithMessage(parsedRunId.data, "error", "ファイルを選択してください。");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return redirectWithMessage(
      parsedRunId.data,
      "error",
      "ファイルサイズが大きすぎます。10MB以下にしてください。"
    );
  }

  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return redirectWithMessage(
      parsedRunId.data,
      "error",
      "TXT または ZIP のみ対応しています。"
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const summary = await importAirworkResults({
      orgId: user.orgId,
      runId: parsedRunId.data,
      userId: user.userId,
      fileName: file.name,
      buffer,
      contentType: file.type || "application/octet-stream"
    });

    return redirectWithMessage(
      parsedRunId.data,
      "success",
      `エラー取り込み完了 (件数: ${summary.errorCount})`
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "RUN_NOT_FOUND"
        ? "Run が見つかりません。"
        : "取り込みに失敗しました。";
    return redirectWithMessage(parsedRunId.data, "error", message);
  }
}
