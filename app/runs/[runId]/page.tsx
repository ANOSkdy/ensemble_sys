import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getRunDetail } from "@/lib/server/runs";
import {
  generateRunFileAction,
  updateRunStatusAction
} from "@/app/runs/actions";
import { RunActionForm } from "@/app/runs/run-action-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const runIdSchema = z.coerce.number().int().positive();

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ja-JP");
}

export default async function RunDetailPage({
  params
}: {
  params: { runId: string };
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
            <h1>Run詳細</h1>
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
            <h1>Run詳細</h1>
            <p>DATABASE_URL が未設定のため、Run を表示できません。</p>
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
            <h1>Run詳細</h1>
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
            <h1>Run詳細</h1>
            <p>Run が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const generateAction = generateRunFileAction.bind(null, run.id);
  const markExecuting = updateRunStatusAction.bind(null, run.id, "executing");
  const markDone = updateRunStatusAction.bind(null, run.id, "done");
  const markFailed = updateRunStatusAction.bind(null, run.id, "failed");

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>Run詳細</h1>
              <p>
                {run.clientName} / {run.runType}
              </p>
              <p>
                {run.status} · {run.fileFormat ?? "N/A"} · 対象 {run.itemCount}
                件
              </p>
            </div>
            <div className="card-actions">
              <Link href="/runs" className="secondary-link">
                Run一覧へ
              </Link>
              <Link href={`/runs/${run.id}/preview`} className="secondary-link">
                プレビュー
              </Link>
            </div>
          </div>
          <p>作成日時: {formatDateTime(run.createdAt)}</p>
          <p>更新日時: {formatDateTime(run.updatedAt)}</p>
          {run.fileBlobUrl ? (
            <p>
              ファイル:{" "}
              <a href={`/api/runs/${run.id}/download`}>ダウンロード</a>
            </p>
          ) : (
            <p>ファイルはまだ生成されていません。</p>
          )}
        </section>

        <section className="card">
          <h2>チェックリスト</h2>
          <ol>
            <li>Airワーク管理画面で一括入稿ファイルをアップロードする。</li>
            <li>反映完了まで待機し、掲載内容を確認する。</li>
            <li>証跡（スクリーンショット等）を添付する。</li>
            <li>結果に応じてステータスを更新する。</li>
          </ol>
        </section>

        <section className="card">
          <h2>アクション</h2>
          <div className="card-actions">
            <RunActionForm action={generateAction} label="ファイル生成" />
            <RunActionForm
              action={markExecuting}
              label="実行中にする"
              variant="secondary"
            />
            <RunActionForm
              action={markDone}
              label="完了にする"
              variant="secondary"
            />
            <RunActionForm
              action={markFailed}
              label="失敗にする"
              variant="secondary"
            />
          </div>
        </section>

        {run.fileSha256 ? (
          <section className="card">
            <h2>ファイル情報</h2>
            <p>SHA256: {run.fileSha256}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
