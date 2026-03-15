import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { FilterBar } from "@/components/ui/FilterBar"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getRunList } from "@/lib/db/queries/runs"
import { formatDateTime } from "@/lib/utils/formatDateTime"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function RunsPage() {
  const rows = await getRunList()

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Runs"
          description="Run list with type, format, and status."
        />

        <FilterBar>
          <div className="text-sm text-slate-500">Total: {rows.length}</div>
          <div className="text-sm text-slate-500">Sort: latest execution</div>
        </FilterBar>

        <SectionCard className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No runs" description="No run records were found." />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "run_type",
                  header: "Run Type",
                  render: (row) => (
                    <Link href={`/runs/${row.id}`} className="text-[#4A90E2] hover:underline">
                      {row.run_type}
                    </Link>
                  ),
                },
                {
                  key: "channel",
                  header: "Channel",
                  render: (row) => row.channel ?? "-",
                },
                {
                  key: "file_format",
                  header: "Format",
                  render: (row) => row.file_format ?? "-",
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => {
                    const mapped = mapStatusToBadge(row.status)
                    return <StatusBadge label={mapped.label} status={mapped.tone} />
                  },
                },
                {
                  key: "executed_at",
                  header: "Executed At",
                  render: (row) => formatDateTime(row.executed_at),
                },
                {
                  key: "completed_at",
                  header: "Completed At",
                  render: (row) => formatDateTime(row.completed_at),
                },
              ]}
              rows={rows}
            />
          )}
        </SectionCard>
      </div>
    </main>
  )
}
