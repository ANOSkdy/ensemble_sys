import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { FilterBar } from "@/components/ui/FilterBar"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getJobList } from "@/lib/db/queries/jobs"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function JobsPage() {
  const rows = await getJobList()

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Jobs"
          description="Job list focused on internal title and status."
        />

        <FilterBar>
          <div className="text-sm text-slate-500">Total: {rows.length}</div>
          <div className="text-sm text-slate-500">Sort: id desc</div>
        </FilterBar>

        <SectionCard className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No jobs" description="No job records were found." />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "internal_title",
                  header: "Title",
                  render: (row) => (
                    <Link href={`/jobs/${row.id}`} className="text-[#4A90E2] hover:underline">
                      {row.internal_title ?? "-"}
                    </Link>
                  ),
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
                  key: "client_id",
                  header: "Client ID",
                  render: (row) => row.client_id,
                  className: "text-xs text-slate-500",
                },
                {
                  key: "memo",
                  header: "Memo",
                  render: (row) => row.memo ?? "-",
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
