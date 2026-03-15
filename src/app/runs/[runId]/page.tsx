import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getRunDetail } from "@/lib/db/queries/run-detail"
import { formatDateTime } from "@/lib/utils/formatDateTime"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const data = await getRunDetail(runId)

  if (!data.run) {
    notFound()
  }

  const mapped = mapStatusToBadge(data.run.status)

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title={data.run.run_type}
          description={`Run ID: ${data.run.id}`}
          actions={<StatusBadge label={mapped.label} status={mapped.tone} />}
        />

        <SectionCard>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-slate-500">Channel</div>
              <div className="mt-1 text-sm text-slate-800">{data.run.channel ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Format</div>
              <div className="mt-1 text-sm text-slate-800">{data.run.file_format ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">SHA256</div>
              <div className="mt-1 break-all text-sm text-slate-800">{data.run.file_sha256 ?? "—"}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Run Items</h2>
          {data.items.length === 0 ? (
            <EmptyState title="run item はありません" />
          ) : (
            <DataTable
              columns={[
                {
                  key: "job_posting_id",
                  header: "Job Posting ID",
                  render: (row) => row.job_posting_id ?? "—",
                },
                {
                  key: "result_status",
                  header: "Result Status",
                  render: (row) => row.result_status ?? "—",
                },
                {
                  key: "updated_at",
                  header: "Updated At",
                  render: (row) => formatDateTime(row.updated_at),
                },
              ]}
              rows={data.items}
            />
          )}
        </SectionCard>
      </div>
    </main>
  )
}