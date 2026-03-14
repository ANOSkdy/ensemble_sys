import { cn } from "@/lib/utils/cn"

export function SummaryCard({
  title,
  value,
  hint,
  className,
}: {
  title: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-800">
        {value}
      </div>
      {hint ? <div className="mt-2 text-sm text-slate-500">{hint}</div> : null}
    </div>
  )
}
