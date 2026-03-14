export function EmptyState({
  title = "データがありません",
  description = "条件を変えるか、新規データを作成してください。",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
      <div className="text-base font-medium text-slate-700">{title}</div>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  )
}
