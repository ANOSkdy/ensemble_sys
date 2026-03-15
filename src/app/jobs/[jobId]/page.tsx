import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getJobDetail } from "@/lib/db/queries/job-detail"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const data = await getJobDetail(jobId)

  if (!data.job) {
    notFound()
  }

  const mapped = mapStatusToBadge(data.job.status)

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title={data.job.internal_title ?? "Untitled Job"}
          description={`Job ID: ${data.job.id}`}
          actions={<StatusBadge label={mapped.label} status={mapped.tone} />}
        />

        <SectionCard>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Client ID</div>
              <div className="mt-1 text-sm text-slate-800">{data.job.client_id}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Org ID</div>
              <div className="mt-1 text-sm text-slate-800">{data.job.org_id}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Job Postings</h2>
          {data.postings.length === 0 ? (
            <EmptyState title="求人投稿はありません" />
          ) : (
            <DataTable
              columns={[
                { key: "channel", header: "Channel", render: (row) => row.channel ?? "—" },
                {
                  key: "publish_status_cache",
                  header: "Publish Status",
                  render: (row) => row.publish_status_cache ?? "—",
                },
              ]}
              rows={data.postings}
            />
          )}
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Revisions</h2>
          {data.revisions.length === 0 ? (
            <EmptyState title="リビジョンはありません" />
          ) : (
            <DataTable
              columns={[
                { key: "rev_no", header: "Rev No", render: (row) => row.rev_no ?? "—" },
                { key: "source", header: "Source", render: (row) => row.source ?? "—" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => {
                    const mapped = mapStatusToBadge(row.status)
                    return <StatusBadge label={mapped.label} status={mapped.tone} />
                  },
                },
              ]}
              rows={data.revisions}
            />
          )}
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">AI Proposals</h2>
          {data.aiProposals.length === 0 ? (
            <EmptyState title="AI提案はありません" />
          ) : (
            <DataTable
              columns={[
                {
                  key: "thinking_level",
                  header: "Thinking Level",
                  render: (row) => row.thinking_level ?? "—",
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => {
                    const mapped = mapStatusToBadge(row.status)
                    return <StatusBadge label={mapped.label} status={mapped.tone} />
                  },
                },
                { key: "meeting_id", header: "Meeting ID", render: (row) => row.meeting_id ?? "—" },
              ]}
              rows={data.aiProposals}
            />
          )}
        </SectionCard>
      </div>
    </main>
  )
}