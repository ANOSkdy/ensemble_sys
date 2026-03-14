import { cn } from "@/lib/utils/cn"

type UiStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "generated"
  | "applied"
  | "dismissed"
  | "queued"
  | "executing"
  | "completed"
  | "failed"
  | "open"
  | "in_progress"
  | "done"
  | "blocked"
  | "canceled"
  | "default"

const styles: Record<UiStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-[#4A90E2]/15 text-[#4A90E2]",
  approved: "bg-[#50E3C2]/20 text-teal-700",
  rejected: "bg-[#F25F5C]/15 text-[#F25F5C]",
  generated: "bg-[#9D59EC]/15 text-[#9D59EC]",
  applied: "bg-[#50E3C2]/20 text-teal-700",
  dismissed: "bg-slate-100 text-slate-600",
  queued: "bg-[#4A90E2]/10 text-[#4A90E2]",
  executing: "bg-[#4A90E2]/15 text-[#4A90E2]",
  completed: "bg-[#50E3C2]/20 text-teal-700",
  failed: "bg-[#F25F5C]/15 text-[#F25F5C]",
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-[#4A90E2]/15 text-[#4A90E2]",
  done: "bg-[#50E3C2]/20 text-teal-700",
  blocked: "bg-[#F25F5C]/15 text-[#F25F5C]",
  canceled: "bg-slate-100 text-slate-500",
  default: "bg-slate-100 text-slate-700",
}

export function StatusBadge({
  label,
  status = "default",
}: {
  label: string
  status?: UiStatus
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        styles[status],
      )}
    >
      {label}
    </span>
  )
}
