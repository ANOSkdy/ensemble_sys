import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMeeting, meetingIdSchema } from "@/lib/meetings";
import { hasDatabaseUrl } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { MeetingEditForm } from "@/app/meetings/meeting-edit-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ja-JP");
}

export default async function MeetingDetailPage({
  params
}: {
  params: { meetingId: string };
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
            <h1>会議ログ詳細</h1>
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
            <h1>会議ログ詳細</h1>
            <p>DATABASE_URL が未設定のため、会議ログを表示できません。</p>
          </section>
        </div>
      </main>
    );
  }

  const meetingIdResult = meetingIdSchema.safeParse(params.meetingId);
  if (!meetingIdResult.success) {
    notFound();
  }

  const meeting = await getMeeting(user.orgId, meetingIdResult.data);
  if (!meeting) {
    notFound();
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <div className="card-header">
            <div>
              <h1>会議ログ詳細</h1>
              <p>{meeting.clientName}</p>
            </div>
            <div className="card-actions">
              <Link href="/meetings" className="secondary-link">
                会議ログ一覧へ
              </Link>
            </div>
          </div>
          <dl>
            <div>
              <dt>Held At</dt>
              <dd>{formatDateTime(meeting.heldAt)}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>
                <Link href={`/clients/${meeting.clientId}`}>
                  {meeting.clientName}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Created By</dt>
              <dd>{meeting.createdByEmail ?? "—"}</dd>
            </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(meeting.updatedAt)}</dd>
          </div>
        </dl>
        <p>{meeting.memo}</p>
      </section>

        <MeetingEditForm meeting={meeting} />
      </div>
    </main>
  );
}
