export function ErrorState({
  title = "データの取得に失敗しました",
  description = "時間をおいて再度お試しください。",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-3xl border border-[#F25F5C]/20 bg-[#F25F5C]/5 p-8 text-center">
      <div className="text-base font-medium text-[#F25F5C]">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}
