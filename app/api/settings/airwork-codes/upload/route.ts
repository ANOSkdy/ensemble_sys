import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdminUser } from "@/lib/server/auth";
import {
  parseAirworkCodesCsv,
  type CsvError
} from "@/lib/server/airwork-csv";
import { isMissingTableError } from "@/lib/todos";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function jsonError(status: number, message: string, errors?: CsvError[]) {
  return NextResponse.json({ ok: false, message, errors }, { status });
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401;
    return jsonError(status, "管理者のみ実行できます。");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    return jsonError(400, "フォームデータの解析に失敗しました。");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "CSVファイルを選択してください。");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(413, "ファイルサイズが大きすぎます。5MB以下にしてください。");
  }

  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);

  const { entries, errors } = parseAirworkCodesCsv(text);
  if (errors.length > 0) {
    return jsonError(400, "CSVの検証でエラーが発生しました。", errors);
  }

  if (entries.length === 0) {
    return jsonError(400, "投入対象のデータ行がありません。");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const sql = `
      INSERT INTO airwork_codes (
        field_key,
        code,
        name_ja,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (field_key, code)
      DO UPDATE SET
        name_ja = EXCLUDED.name_ja,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `;

    for (const entry of entries) {
      await client.query(sql, [
        entry.fieldKey,
        entry.code,
        entry.nameJa,
        entry.isActive
      ]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (isMissingTableError(error)) {
      return jsonError(500, "airwork_codes テーブルが見つかりません。");
    }
    return jsonError(500, "CSVの取り込みに失敗しました。");
  } finally {
    client.release();
  }

  return NextResponse.json({
    ok: true,
    message: "airwork_codes を取り込みました。",
    processed: entries.length
  });
}
