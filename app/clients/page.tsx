import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import {
  listClients,
  createClient,
  parseClientFormData
} from "@/lib/server/clients";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientsPageProps = {
  searchParams?: { q?: string };
};

async function getUserOrg() {
  try {
    const user = await requireUser();
    if (user.orgId === null) {
      notFound();
    }
    return user;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await getUserOrg();
  const orgId = user.orgId ?? notFound();
  const query = searchParams?.q?.trim();
  const clients = await listClients(orgId, query);

  async function createClientAction(formData: FormData) {
    "use server";
    const currentUser = await getUserOrg();
    const currentOrgId = currentUser.orgId ?? notFound();
    const data = parseClientFormData(formData);
    const client = await createClient(currentOrgId, data);
    redirect(`/clients/${client.id}`);
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>クライアント</h1>
          <p>顧客情報を組織単位で管理します。</p>
        </section>
        <section className="card">
          <h2>クライアント一覧</h2>
          {clients.length === 0 ? (
            <p>まだクライアントが登録されていません。</p>
          ) : (
            <ul className="list">
              {clients.map((client) => (
                <li key={client.id} className="list-item">
                  <div>
                    <p className="list-title">{client.name}</p>
                    {client.industry ? (
                      <p className="summary-label">業種: {client.industry}</p>
                    ) : null}
                  </div>
                  <div className="list-meta">
                    <span />
                    <Link className="button-link" href={`/clients/${client.id}`}>
                      詳細を見る
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>クライアント作成</h2>
          <form action={createClientAction}>
            <div>
              <label htmlFor="client-name">名称 *</label>
              <input
                id="client-name"
                name="name"
                required
                placeholder="例: 株式会社サンプル"
              />
            </div>
            <div>
              <label htmlFor="client-industry">業種</label>
              <input id="client-industry" name="industry" placeholder="例: IT" />
            </div>
            <div>
              <label htmlFor="client-owner">担当者名</label>
              <input
                id="client-owner"
                name="ownerName"
                placeholder="例: 山田 太郎"
              />
            </div>
            <div>
              <label htmlFor="client-timezone">タイムゾーン</label>
              <input
                id="client-timezone"
                name="timezone"
                placeholder="Asia/Tokyo"
              />
            </div>
            <div>
              <label htmlFor="client-notes">メモ</label>
              <textarea
                id="client-notes"
                name="notes"
                rows={4}
                placeholder="補足情報"
              />
            </div>
            <button type="submit">作成</button>
          </form>
        </section>
      </div>
    </main>
  );
}
