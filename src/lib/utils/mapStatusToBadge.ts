export function mapStatusToBadge(status: string | null | undefined): {
  label: string
  tone:
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
} {
  switch (status) {
    case "draft":
      return { label: "draft", tone: "draft" }
    case "in_review":
      return { label: "in_review", tone: "in_review" }
    case "approved":
      return { label: "approved", tone: "approved" }
    case "rejected":
      return { label: "rejected", tone: "rejected" }
    case "generated":
      return { label: "generated", tone: "generated" }
    case "applied":
      return { label: "applied", tone: "applied" }
    case "dismissed":
      return { label: "dismissed", tone: "dismissed" }
    case "queued":
      return { label: "queued", tone: "queued" }
    case "executing":
      return { label: "executing", tone: "executing" }
    case "completed":
      return { label: "completed", tone: "completed" }
    case "failed":
      return { label: "failed", tone: "failed" }
    case "open":
      return { label: "open", tone: "open" }
    case "in_progress":
      return { label: "in_progress", tone: "in_progress" }
    case "done":
      return { label: "done", tone: "done" }
    case "blocked":
      return { label: "blocked", tone: "blocked" }
    case "canceled":
      return { label: "canceled", tone: "canceled" }
    default:
      return { label: status ?? "-", tone: "default" }
  }
}
