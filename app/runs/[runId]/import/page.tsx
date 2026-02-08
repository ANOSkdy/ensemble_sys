import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getRunDetail } from "@/lib/server/runs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const runIdSchema = z.coerce.number().int().positive();

function getMessageFromSearchParams(params: {
  section?: string;
  status?: string;
  message?: string;
}) {
  if (!params.section || !params.status || !params.message) {
    return null;
  }
  return {
    section: params.section,
    status: params.status === "success" ? "success" : "error",
    message: params.message
  };
}

export default async function RunImportPage({
  params,
  searchParams
}: {
  params: { runId: string };
  searchParams?: { section?: string; status?: string; message?: string };
}) {
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
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>取り込み</h1>
            <p>組織情報が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  if (!hasDatabaseUrl()) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>取り込み</h1>
            <p>DATABASE_URL が未設定のため、取り込みを利用できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const parsedRunId = runIdSchema.safeParse(params.runId);
  if (!parsedRunId.success) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>取り込み</h1>
            <p>Run ID が不正です。</p>
          </section>
        </div>
      </main>
    );
  }

  const run = await getRunDetail(user.orgId, parsedRunId.data);
  if (!run) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>取り込み</h1>
            <p>Run が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const message = getMessageFromSearchParams(searchParams ?? {});

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>取り込み</h1>
              <p>
                {run.clientName} / {run.runType} · {run.status}
              </p>
            </div>
            <div className="card-actions">
              <Link href={`/runs/${run.id}`} className="secondary-link">
                Run詳細へ
              </Link>
              <Link href={`/runs/${run.id}/preview`} className="secondary-link">
                プレビューへ
              </Link>
            </div>
          </div>
          <p>Airワークの出力ファイルをアップロードして同期します。</p>
        </section>

        {message ? (
          <section className="card">
            <p className="list-meta">
              {message.status === "success" ? "✅ " : "⚠️ "}
              {message.message}
            </p>
          </section>
        ) : null}

        <section className="card">
          <h2>Import Airwork Jobs Export</h2>
          <p>job_offer_id と掲載ステータスを同期します。</p>
          <form
            method="post"
            action={`/api/runs/${run.id}/import/airwork-export`}
            encType="multipart/form-data"
          >
            <label className="form-label">
              XLSX / TSV (.txt)
              <input type="file" name="file" accept=".xlsx,.txt" required />
            </label>
            <button type="submit">取り込み</button>
          </form>
        </section>

        <section className="card">
          <h2>Import Airwork Bulk Upload Result</h2>
          <p>入稿結果のエラーを Run に紐付けます。</p>
          <form
            method="post"
            action={`/api/runs/${run.id}/import/airwork-results`}
            encType="multipart/form-data"
          >
            <label className="form-label">
              TXT / ZIP
              <input type="file" name="file" accept=".txt,.zip" required />
            </label>
            <button type="submit">取り込み</button>
          </form>
        </section>
      </div>
    </main>
  );
}
