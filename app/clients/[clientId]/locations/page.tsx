import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { clientIdSchema, getClient } from "@/lib/clients";
import { listLocations } from "@/lib/airwork-locations";
import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction
} from "@/app/clients/[clientId]/locations/actions";
import {
  LocationCreateForm,
  LocationEditForm
} from "@/app/clients/[clientId]/locations/location-forms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientLocationsPageProps = {
  params: { clientId: string };
};

export default async function ClientLocationsPage({
  params
}: ClientLocationsPageProps) {
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

  const locations = await listLocations(user.orgId, client.id);

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="summary-label">勤務地・拠点管理</p>
              <h1>{client.name}</h1>
            </div>
            <Link href={`/clients/${client.id}`} className="secondary-link">
              クライアントへ戻る
            </Link>
          </div>
          <div className="list-meta">
            <span>業種: {client.industry ?? "未設定"}</span>
            <span>担当者: {client.ownerName ?? "未設定"}</span>
            <span>タイムゾーン: {client.timezone}</span>
          </div>
        </section>

        <section>
          <h2>勤務地IDの登録</h2>
          <LocationCreateForm
            action={createLocationAction.bind(null, client.id)}
          />
        </section>

        <section>
          <div className="card-header">
            <h2>登録済み勤務地</h2>
            <Link href={`/clients/${client.id}/jobs`} className="button-link">
              求人管理へ進む
            </Link>
          </div>
          {locations.length === 0 ? (
            <p className="summary-label">
              まだ勤務地IDが登録されていません。
            </p>
          ) : (
            <div className="list">
              {locations.map((location) => (
                <LocationEditForm
                  key={location.id}
                  action={updateLocationAction.bind(
                    null,
                    client.id,
                    location.id
                  )}
                  deleteAction={deleteLocationAction.bind(
                    null,
                    client.id,
                    location.id
                  )}
                  defaultValues={{
                    locationId: location.id,
                    workingLocationId: location.workingLocationId,
                    nameJa: location.nameJa,
                    memo: location.memo
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
