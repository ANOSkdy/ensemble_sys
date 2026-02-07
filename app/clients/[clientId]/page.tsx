import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import {
  getClient,
  updateClient,
  parseClientFormData,
  isValidClientId
} from "@/lib/server/clients";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientDetailPageProps = {
  params: { clientId: string };
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

export default async function ClientDetailPage({
  params
}: ClientDetailPageProps) {
  if (!isValidClientId(params.clientId)) {
    notFound();
  }

  const user = await getUserOrg();
  const orgId = user.orgId;
  if (orgId == null) {
    redirect("/login");
  }
  const client = await getClient(orgId, params.clientId);

  if (!client) {
    notFound();
  }

  async function updateClientAction(formData: FormData) {
    "use server";
    const currentUser = await getUserOrg();
    const currentOrgId = currentUser.orgId;
    if (currentOrgId == null) {
      redirect("/login");
    }
    const data = parseClientFormData(formData);
    const updated = await updateClient(
      currentOrgId,
      params.clientId,
      data
    );
    if (!updated) {
      notFound();
    }
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <div>
            <Link className="button-link" href="/clients">
              ← クライアント一覧へ戻る
            </Link>
          </div>
          <div>
            <h1>{client.name}</h1>
            <p>クライアント詳細と基本情報を管理します。</p>
          </div>
        </section>
        <section className="card">
          <h2>関連ページ</h2>
          <div className="link-grid">
            <Link className="link-card" href={`/clients/${client.id}/channels`}>
              媒体チャネル /channels
            </Link>
            <Link className="link-card" href={`/clients/${client.id}/locations`}>
              拠点 /locations
            </Link>
            <Link className="link-card" href={`/clients/${client.id}/jobs`}>
              求人 /jobs
            </Link>
          </div>
        </section>
        <section className="card">
          <h2>基本情報</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <p className="summary-label">業種</p>
              <p className="summary-value">{client.industry ?? "-"}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">担当者名</p>
              <p className="summary-value">{client.owner_name ?? "-"}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">タイムゾーン</p>
              <p className="summary-value">{client.timezone}</p>
            </div>
          </div>
          {client.notes ? <p>{client.notes}</p> : null}
        </section>
        <section className="card">
          <h2>編集</h2>
          <form action={updateClientAction}>
            <div>
              <label htmlFor="detail-name">名称 *</label>
              <input
                id="detail-name"
                name="name"
                required
                defaultValue={client.name}
                placeholder="例: 株式会社サンプル"
              />
            </div>
            <div>
              <label htmlFor="detail-industry">業種</label>
              <input
                id="detail-industry"
                name="industry"
                defaultValue={client.industry ?? ""}
                placeholder="例: IT"
              />
            </div>
            <div>
              <label htmlFor="detail-owner">担当者名</label>
              <input
                id="detail-owner"
                name="ownerName"
                defaultValue={client.owner_name ?? ""}
                placeholder="例: 山田 太郎"
              />
            </div>
            <div>
              <label htmlFor="detail-timezone">タイムゾーン</label>
              <input
                id="detail-timezone"
                name="timezone"
                defaultValue={client.timezone}
                placeholder="Asia/Tokyo"
              />
            </div>
            <div>
              <label htmlFor="detail-notes">メモ</label>
              <textarea
                id="detail-notes"
                name="notes"
                rows={4}
                defaultValue={client.notes ?? ""}
                placeholder="補足情報"
              />
            </div>
            <button type="submit">保存</button>
          </form>
        </section>
      </div>
    </main>
  );
}
