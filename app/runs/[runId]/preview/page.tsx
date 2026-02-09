import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import {
  getRunDetail,
  listRunItems
} from "@/lib/server/runs";
import { validateRunItems } from "@/src/server/airwork/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const runIdSchema = z.coerce.number().int().positive();

export default async function RunPreviewPage({
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
            <h1>Runプレビュー</h1>
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
            <h1>Runプレビュー</h1>
            <p>DATABASE_URL が未設定のため、プレビューを表示できません。</p>
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
            <h1>Runプレビュー</h1>
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
            <h1>Runプレビュー</h1>
            <p>Run が見つかりません。</p>
          </section>
        </div>
      </main>
    );
  }

  const items = await listRunItems(user.orgId, parsedRunId.data);
  const validationSummary = await validateRunItems(user.orgId, parsedRunId.data);
  const validationById = new Map(
    validationSummary.items.map((entry) => [entry.runItemId, entry])
  );

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>Runプレビュー</h1>
              <p>
                {run.clientName} / {run.runType} · {run.status}
              </p>
            </div>
            <div className="card-actions">
              <Link href={`/runs/${run.id}`} className="secondary-link">
                Run詳細へ
              </Link>
            </div>
          </div>
          <p>生成前に差分と検証結果を確認してください。</p>
          <div className="list-meta">
            <span className="tag">Hard {validationSummary.hardErrorCount}</span>
            <span className="tag">Warning {validationSummary.warningCount}</span>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="card">
            <p>対象求人がありません。</p>
          </section>
        ) : (
          <section className="card">
            <h2>対象一覧</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>求人</th>
                    <th>アクション</th>
                    <th>主な項目</th>
                    <th>検証結果</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const validation = validationById.get(item.id);
                    const title = item.payload?.title ?? "—";
                    const description = item.payload?.description ?? "—";
                    const jobOfferId =
                      item.payload?.job_offer_id ?? item.jobOfferId ?? "—";
                    const hardErrors = validation?.hardErrors ?? [];
                    const warnings = validation?.warnings ?? [];
                    const importErrors = validation?.importedErrors ?? [];

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.jobTitle}</strong>
                          <p className="list-meta">{item.clientName}</p>
                        </td>
                        <td>{item.action}</td>
                        <td className="list-meta">
                          <div>job_offer_id: {jobOfferId}</div>
                          <div>title: {title}</div>
                          <div>description: {description}</div>
                        </td>
                        <td>
                          <div className="list-meta">
                            <span className="tag">Hard {hardErrors.length}</span>
                            <span className="tag">Warn {warnings.length}</span>
                          </div>
                          {hardErrors.length === 0 &&
                          warnings.length === 0 &&
                          importErrors.length === 0 ? (
                            <p className="list-meta">問題なし</p>
                          ) : (
                            <details>
                              <summary>詳細を見る</summary>
                              {hardErrors.length > 0 ? (
                                <>
                                  <p className="list-meta">ハードエラー</p>
                                  <ul>
                                    {hardErrors.map((error, index) => (
                                      <li key={`${item.id}-hard-${index}`}>
                                        {error.message}
                                        {error.field_key
                                          ? ` (${error.field_key})`
                                          : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                              {warnings.length > 0 ? (
                                <>
                                  <p className="list-meta">警告</p>
                                  <ul className="list-meta">
                                    {warnings.map((warning, index) => (
                                      <li key={`${item.id}-warn-${index}`}>
                                        {warning.message}
                                        {warning.field_key
                                          ? ` (${warning.field_key})`
                                          : ""}
                                        {warning.detail ? ` ${warning.detail}` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                              {importErrors.length > 0 ? (
                                <>
                                  <p className="list-meta">入稿結果エラー</p>
                                  <ul>
                                    {importErrors.map((error, index) => (
                                      <li key={`${item.id}-import-${index}`}>
                                        {error.message}
                                        {error.field_key
                                          ? ` (${error.field_key})`
                                          : ""}
                                        {error.row_number
                                          ? ` 行:${error.row_number}`
                                          : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                            </details>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
