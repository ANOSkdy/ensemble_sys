export function FilterBar({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  )
}
