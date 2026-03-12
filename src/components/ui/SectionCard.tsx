import { cn } from "@/lib/utils/cn"

export function SectionCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <section className={cn("rounded-3xl bg-white p-6 shadow-sm", className)}>{children}</section>
}
