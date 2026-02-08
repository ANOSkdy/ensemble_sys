import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { clientIdSchema, getClient } from "@/lib/clients";
import { getChannelAccount } from "@/lib/channel-accounts";
import { ChannelAccountForm } from "@/app/home/[clientId]/channels/channel-account-form";
import { upsertChannelAccountAction } from "@/app/home/[clientId]/channels/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientChannelsPageProps = {
  params: { clientId: string };
};

export default async function ClientChannelsPage({
  params
}: ClientChannelsPageProps) {
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

  const channelAccount = await getChannelAccount(user.orgId, client.id);

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="summary-label">媒体チャネル管理</p>
              <h1>{client.name}</h1>
            </div>
            <Link href={`/home/${client.id}`} className="secondary-link">
              クライアントへ戻る
            </Link>
          </div>
          <div className="list-meta">
            <span>業種: {client.industry ?? "未設定"}</span>
            <span>担当者: {client.ownerName ?? "未設定"}</span>
            <span>タイムゾーン: {client.timezone}</span>
          </div>
        </section>

        <section className="card">
          <h2>Airワーク媒体アカウント</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <p className="summary-label">管理URL</p>
              <p>{channelAccount?.managementUrl ?? "未登録"}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">ログインID</p>
              <p>{channelAccount?.loginId ?? "未登録"}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">運用メモ</p>
              <p>{channelAccount?.memo ?? "未登録"}</p>
            </div>
          </div>
          <p className="summary-label">
            パスワードは外部で管理します（本画面では保存しません）。
          </p>
        </section>

        <section>
          <h2>Airワーク情報の更新</h2>
          <ChannelAccountForm
            action={upsertChannelAccountAction.bind(null, client.id)}
            defaultValues={{
              managementUrl: channelAccount?.managementUrl,
              loginId: channelAccount?.loginId,
              memo: channelAccount?.memo
            }}
          />
        </section>
      </div>
    </main>
  );
}
