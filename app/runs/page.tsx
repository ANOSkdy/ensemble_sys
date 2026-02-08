import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import { listClients } from "@/lib/clients";
import { listRuns } from "@/lib/server/runs";
import { RunForm } from "@/app/runs/run-form";
import { createRunAction } from "@/app/runs/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RunsPage() {
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
            <h1>Runs</h1>
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
            <h1>Runs</h1>
            <p>DATABASE_URL が未設定のため、Run を作成できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const [clients, runs] = await Promise.all([
    listClients(user.orgId),
    listRuns(user.orgId)
  ]);

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>Runs</h1>
          <p>承認済み求人から Airワーク入稿ファイルを作成します。</p>
        </section>

        <section>
          <h2>新規Run</h2>
          {clients.length === 0 ? (
            <p>先にクライアントを登録してください。</p>
          ) : (
            <RunForm clients={clients} action={createRunAction} />
          )}
        </section>

        <section className="card">
          <h2>Run一覧</h2>
          {runs.length === 0 ? (
            <p>まだ Run がありません。</p>
          ) : (
            <div className="list">
              {runs.map((run) => (
                <div key={run.id} className="list-item">
                  <div>
                    <p className="list-title">
                      {run.clientName} / {run.runType}
                    </p>
                    <p className="list-meta">
                      {run.status} · {run.fileFormat ?? "N/A"}
                    </p>
                  </div>
                  <div className="list-meta">
                    <span>{new Date(run.createdAt).toLocaleString()}</span>
                    <Link href={`/runs/${run.id}`}>詳細</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
