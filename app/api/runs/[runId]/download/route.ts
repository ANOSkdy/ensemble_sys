import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { isMissingTableError } from "@/lib/clients";

export const runtime = "nodejs";

const runIdSchema = z.coerce.number().int().positive();

export async function GET(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    return NextResponse.json({ ok: false, message: "認証が必要です。" }, { status: 401 });
  }

  if (user.orgId === null) {
    return NextResponse.json({ ok: false, message: "組織情報がありません。" }, { status: 403 });
  }

  const parsedRunId = runIdSchema.safeParse(params.runId);
  if (!parsedRunId.success) {
    return NextResponse.json({ ok: false, message: "Run ID が不正です。" }, { status: 400 });
  }

  try {
    const result = await query<{ file_blob_url: string | null }>(
      `SELECT file_blob_url
       FROM runs
       WHERE id = $1 AND org_id = $2
       LIMIT 1`,
      [parsedRunId.data, user.orgId]
    );

    const row = result.rows[0];
    if (!row || !row.file_blob_url) {
      return NextResponse.json({ ok: false, message: "ファイルが見つかりません。" }, { status: 404 });
    }

    return NextResponse.redirect(row.file_blob_url, { status: 302 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ ok: false, message: "テーブルが見つかりません。" }, { status: 500 });
    }
    return NextResponse.json({ ok: false, message: "ダウンロードに失敗しました。" }, { status: 500 });
  }
}
