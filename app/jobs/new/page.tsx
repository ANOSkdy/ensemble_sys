import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import { listClients } from "@/lib/clients";
import { JobForm } from "@/app/jobs/job-form";
import { createJobAction } from "@/app/jobs/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewJobPage() {
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
            <h1>求人作成</h1>
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
            <h1>求人作成</h1>
            <p>DATABASE_URL が未設定のため、求人を作成できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const clients = await listClients(user.orgId);

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>求人作成</h1>
          <p>社内の求人を登録します。最初に Airワーク用の投稿枠も作成します。</p>
        </section>
        {clients.length === 0 ? (
          <section className="card">
            <h2>クライアントが必要です</h2>
            <p>まずはクライアントを登録してください。</p>
          </section>
        ) : (
          <section>
            <h2>新規求人</h2>
            <JobForm action={createJobAction} clients={clients} />
          </section>
        )}
      </div>
    </main>
  );
}
