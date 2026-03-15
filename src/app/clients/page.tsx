import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { FilterBar } from "@/components/ui/FilterBar"
import { SectionCard } from "@/components/ui/SectionCard"
import { getClientList } from "@/lib/db/queries/clients"

export default async function ClientsPage() {
  const rows = await getClientList()

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Clients"
          description="Client list based on the actual database schema."
        />

        <FilterBar>
          <div className="text-sm text-slate-500">Total: {rows.length}</div>
          <div className="text-sm text-slate-500">Sort: name asc</div>
        </FilterBar>

        <SectionCard className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No clients" description="No client records were found." />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (row) => (
                    <Link href={`/clients/${row.id}`} className="text-[#4A90E2] hover:underline">
                      {row.name}
                    </Link>
                  ),
                },
                {
                  key: "owner_name",
                  header: "Owner",
                  render: (row) => row.owner_name ?? "-",
                },
                {
                  key: "memo",
                  header: "Memo",
                  render: (row) => row.memo ?? "-",
                },
                {
                  key: "id",
                  header: "ID",
                  render: (row) => row.id,
                  className: "text-xs text-slate-500",
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
