import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { listClients } from "@/lib/clients";
import { ClientForm } from "@/app/home/client-form";
import { createClientAction } from "@/app/home/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientsPage() {
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
            <h1>顧客管理</h1>
            <p>組織情報が見つかりません。</p>
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
          <h1>顧客管理</h1>
          <p>CRM の起点となる顧客一覧です。最小情報で登録できます。</p>
        </section>
        <details className="card collapsible">
          <summary>新規クライアント</summary>
          <div className="collapsible-body">
            <p>必要最低限の情報でクライアント登録を進められます。</p>
            <ClientForm
              action={createClientAction}
              submitLabel="クライアントを作成"
            />
          </div>
        </details>
        <section className="card">
          <h2>クライアント一覧</h2>
          {clients.length === 0 ? (
            <p>まだクライアントが登録されていません。</p>
          ) : (
            <ul className="list">
              {clients.map((client) => (
                <li key={client.id} className="list-item">
                  <div>
                    <strong>{client.name}</strong>
                    <p className="summary-label">
                      {client.industry ?? "業種未設定"} · {client.timezone}
                    </p>
                  </div>
                  <Link href={`/home/${client.id}`}>詳細を見る</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
