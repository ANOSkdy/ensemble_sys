import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { FilterBar } from "@/components/ui/FilterBar"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getTodoList } from "@/lib/db/queries/todos"
import { formatDateTime } from "@/lib/utils/formatDateTime"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function TodosPage() {
  const rows = await getTodoList()

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="ToDos"
          description="Todo list with status and due dates."
        />

        <FilterBar>
          <div className="text-sm text-slate-500">Total: {rows.length}</div>
          <div className="text-sm text-slate-500">Sort: due/completed desc</div>
        </FilterBar>

        <SectionCard className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No todos" description="No todo records were found." />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "title",
                  header: "Title",
                  render: (row) => (
                    <Link href={`/todos/${row.id}`} className="text-[#4A90E2] hover:underline">
                      {row.title}
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
                  key: "assigned_to",
                  header: "Assigned To",
                  render: (row) => row.assigned_to ?? "-",
                },
                {
                  key: "due_date",
                  header: "Due Date",
                  render: (row) => formatDateTime(row.due_date),
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
