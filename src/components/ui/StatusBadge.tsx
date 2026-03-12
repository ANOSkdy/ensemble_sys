import type { AppStatus } from "@/types/status"

const statusMap: Record<AppStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-[#4A90E2]/15 text-[#4A90E2]",
  approved: "bg-[#50E3C2]/20 text-teal-700",
  applied: "bg-[#50E3C2]/20 text-teal-700",
  executing: "bg-[#4A90E2]/15 text-[#4A90E2]",
  done: "bg-[#50E3C2]/20 text-teal-700",
  failed: "bg-[#F25F5C]/15 text-[#F25F5C]",
  blocked: "bg-[#F25F5C]/15 text-[#F25F5C]",
  ai: "bg-[#9D59EC]/15 text-[#9D59EC]",
}

export function StatusBadge({ status }: { status: AppStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusMap[status]}`}>{status}</span>
}
