export function LoadingState({
  label = "読み込み中...",
}: {
  label?: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      {label}
    </div>
  )
}
