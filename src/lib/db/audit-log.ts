import "server-only"

export async function recordAuditLog(input: {
  action: string
  target_table: string
  target_id: string
  detail?: unknown
}) {
  void input
  return
}
