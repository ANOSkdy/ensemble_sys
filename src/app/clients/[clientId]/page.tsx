import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getClientDetail } from "@/lib/db/queries/client-detail"
import { formatDateTime } from "@/lib/utils/formatDateTime"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const data = await getClientDetail(clientId)

  if (!data.client) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title={data.client.name}
          description={`Client ID: ${data.client.id}`}
          actions={<StatusBadge label="Detail" status="in_review" />}
        />

        <SectionCard>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Owner</div>
              <div className="mt-1 text-sm text-slate-800">{data.client.owner_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Org ID</div>
              <div className="mt-1 text-sm text-slate-800">{data.client.org_id}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Channel Accounts</h2>
          {data.channelAccounts.length === 0 ? (
            <EmptyState title="チャネルアカウントはありません" />
          ) : (
            <DataTable
              columns={[
                { key: "channel", header: "Channel", render: (row) => row.channel ?? "—" },
                { key: "login_id", header: "Login ID", render: (row) => row.login_id ?? "—" },
                { key: "memo", header: "Memo", render: (row) => row.memo ?? "—" },
              ]}
              rows={data.channelAccounts}
            />
          )}
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Locations</h2>
          {data.locations.length === 0 ? (
            <EmptyState title="勤務地はありません" />
          ) : (
            <DataTable
              columns={[
                { key: "name_ja", header: "Name", render: (row) => row.name_ja ?? "—" },
                { key: "memo", header: "Memo", render: (row) => row.memo ?? "—" },
                {
                  key: "is_active",
                  header: "Active",
                  render: (row) => (row.is_active == null ? "—" : row.is_active ? "Yes" : "No"),
                },
              ]}
              rows={data.locations}
            />
          )}
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Jobs</h2>
          {data.jobs.length === 0 ? (
            <EmptyState title="求人はありません" />
          ) : (
            <DataTable
              columns={[
                { key: "internal_title", header: "Title", render: (row) => row.internal_title ?? "—" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => {
                    const mapped = mapStatusToBadge(row.status)
                    return <StatusBadge label={mapped.label} status={mapped.tone} />
                  },
                },
              ]}
              rows={data.jobs}
            />
          )}
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Meetings</h2>
          {data.meetings.length === 0 ? (
            <EmptyState title="会議メモはありません" />
          ) : (
            <DataTable
              columns={[
                { key: "title", header: "Title", render: (row) => row.title ?? "—" },
                { key: "memo", header: "Memo", render: (row) => row.memo ?? "—" },
                {
                  key: "meeting_date",
                  header: "Meeting Date",
                  render: (row) => formatDateTime(row.meeting_date),
                },
              ]}
              rows={data.meetings}
            />
          )}
        </SectionCard>
      </div>
    </main>
  )
}