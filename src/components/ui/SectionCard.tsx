import { cn } from "@/lib/utils/cn"

export function SectionCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200",
        className,
      )}
    >
      {children}
    </section>
  )
}
