import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { clientIdSchema, getClient } from "@/lib/clients";
import { ClientForm } from "@/app/clients/client-form";
import { updateClientAction } from "@/app/clients/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientDetailPageProps = {
  params: { clientId: string };
};

export default async function ClientDetailPage({
  params
}: ClientDetailPageProps) {
  const parsedId = clientIdSchema.safeParse(params.clientId);
  if (!parsedId.success) {
    notFound();
  }

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
    notFound();
  }

  const client = await getClient(user.orgId, parsedId.data);
  if (!client) {
    notFound();
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="summary-label">クライアント詳細</p>
              <h1>{client.name}</h1>
            </div>
            <Link href="/clients" className="secondary-link">
              一覧へ戻る
            </Link>
          </div>
          <div className="list-meta">
            <span>業種: {client.industry ?? "未設定"}</span>
            <span>担当者: {client.ownerName ?? "未設定"}</span>
            <span>タイムゾーン: {client.timezone}</span>
          </div>
        </section>
        <section>
          <h2>クライアント情報の更新</h2>
          <ClientForm
            action={updateClientAction.bind(null, client.id)}
            submitLabel="更新する"
            defaultValues={{
              name: client.name,
              industry: client.industry,
              ownerName: client.ownerName,
              notes: client.notes,
              timezone: client.timezone
            }}
          />
        </section>
        <section className="card">
          <h2>次の管理へ</h2>
          <div className="link-grid">
            <Link href={`/clients/${client.id}/channels`} className="link-card">
              媒体チャネル管理
            </Link>
            <Link
              href={`/clients/${client.id}/locations`}
              className="link-card"
            >
              勤務地・拠点管理
            </Link>
            <Link href={`/clients/${client.id}/jobs`} className="link-card">
              求人管理
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
