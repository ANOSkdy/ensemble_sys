import Link from "next/link";
import { redirect } from "next/navigation";
import { listClients } from "@/lib/clients";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { createMeetingAction } from "@/app/meetings/actions";
import { MeetingForm } from "@/app/meetings/meeting-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewMeetingPage() {
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
            <h1>会議ログ作成</h1>
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
            <h1>会議ログ作成</h1>
            <p>DATABASE_URL が未設定のため、会議ログを作成できません。</p>
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
          <div className="card-header">
            <div>
              <h1>会議ログ作成</h1>
              <p>顧客ヒアリングや改善方針を記録します。</p>
            </div>
            <div className="card-actions">
              <Link href="/meetings" className="secondary-link">
                会議ログ一覧へ
              </Link>
            </div>
          </div>
        </section>

        {clients.length === 0 ? (
          <section className="card">
            <p>会議ログを作成するにはクライアントが必要です。</p>
            <Link href="/home" className="secondary-link">
              クライアント一覧へ
            </Link>
          </section>
        ) : (
          <MeetingForm clients={clients} action={createMeetingAction} />
        )}
      </div>
    </main>
  );
}
