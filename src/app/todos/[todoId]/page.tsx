import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getTodoDetail } from "@/lib/db/queries/todo-detail"
import { formatDateTime } from "@/lib/utils/formatDateTime"
import { mapStatusToBadge } from "@/lib/utils/mapStatusToBadge"

export default async function TodoDetailPage({
  params,
}: {
  params: Promise<{ todoId: string }>
}) {
  const { todoId } = await params
  const data = await getTodoDetail(todoId)

  if (!data) {
    notFound()
  }

  const mapped = mapStatusToBadge(data.status)

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title={data.title}
          description={`Todo ID: ${data.id}`}
          actions={<StatusBadge label={mapped.label} status={mapped.tone} />}
        />

        <SectionCard>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Due At</div>
              <div className="mt-1 text-sm text-slate-800">{formatDateTime(data.due_at)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Org ID</div>
              <div className="mt-1 text-sm text-slate-800">{data.org_id}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Instructions</h2>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            {data.instructions ?? "—"}
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Evidence URLs</h2>
          {!data.evidence_urls || data.evidence_urls.length === 0 ? (
            <EmptyState title="証跡URLはありません" />
          ) : (
            <ul className="space-y-2">
              {data.evidence_urls.map((url, index) => (
                <li key={index} className="break-all rounded-2xl bg-slate-50 p-4 text-sm text-[#4A90E2]">
                  {url}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </main>
  )
}