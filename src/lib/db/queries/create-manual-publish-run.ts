import "server-only"
import { sql } from "@/lib/db/client"

export type CreateManualPublishRunInput = {
  org_id: string
  client_id: string
  job_posting_id: string
  job_revision_id: string
  created_by: string
  channel?: string
  run_type?: string
  file_format?: string
}

export type RunRow = {
  id: string
  org_id: string
  client_id: string
  channel: string
  run_type: string
  status: string
  file_format: string
  file_blob_url: string | null
  file_sha256: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export async function createManualPublishRun(
  input: CreateManualPublishRunInput,
): Promise<{ run: RunRow; runItemId: string }> {
  const channel = input.channel ?? "airwork"
  const runType = input.run_type ?? "update"
  const fileFormat = input.file_format ?? "txt"

  const runRows = await sql`
    insert into runs (
      org_id,
      client_id,
      channel,
      run_type,
      status,
      file_format,
      created_by
    )
    values (
      ${input.org_id}::uuid,
      ${input.client_id}::uuid,
      ${channel},
      ${runType},
      ${"draft"},
      ${fileFormat},
      ${input.created_by}::uuid
    )
    returning
      id::text,
      org_id::text,
      client_id::text,
      channel,
      run_type,
      status,
      file_format,
      file_blob_url,
      file_sha256,
      created_by::text,
      created_at::text,
      updated_at::text
  `

  const run = runRows[0] as RunRow

  const itemRows = await sql`
    insert into run_items (
      run_id,
      job_posting_id,
      job_revision_id,
      action,
      validation_errors
    )
    values (
      ${run.id}::uuid,
      ${input.job_posting_id}::uuid,
      ${input.job_revision_id}::uuid,
      ${"update"},
      ${JSON.stringify([])}::jsonb
    )
    returning id::text
  `

  const runItemId = (itemRows[0] as { id: string }).id

  return { run, runItemId }
}
