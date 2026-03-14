export type DbId = string

export type DbOrganization = {
  id: DbId
  code?: string | null
  name: string
}

export type DbUser = {
  id: DbId
  org_id: DbId
  email: string
  name?: string | null
  role?: string | null
  is_active?: boolean | null
}

export type DbClient = {
  id: DbId
  org_id: DbId
  name: string
  owner_name?: string | null
  memo?: string | null
}

export type DbChannelAccount = {
  id: DbId
  org_id: DbId
  client_id: DbId
  channel?: string | null
  login_id?: string | null
  login_secret_encrypted?: string | null
  memo?: string | null
}

export type DbAirworkLocation = {
  id: DbId
  org_id: DbId
  client_id: DbId
  name_ja?: string | null
  memo?: string | null
  is_active?: boolean | null
}

export type DbJob = {
  id: DbId
  org_id: DbId
  client_id: DbId
  internal_title?: string | null
  memo?: string | null
  status?: string | null
}

export type DbJobPosting = {
  id: DbId
  org_id: DbId
  job_id: DbId
  channel?: string | null
  publish_status_cache?: string | null
}

export type DbJobRevision = {
  id: DbId
  org_id: DbId
  job_posting_id: DbId
  rev_no?: number | null
  source?: string | null
  payload_json?: unknown
  payload_hash?: string | null
  status?: string | null
}

export type DbAiProposal = {
  id: DbId
  org_id: DbId
  meeting_id?: DbId | null
  job_revision_id?: DbId | null
  thinking_level?: string | null
  status?: string | null
  output_json?: unknown
}

export type DbRun = {
  id: DbId
  org_id: DbId
  run_type: string
  channel?: string | null
  file_format?: string | null
  file_sha256?: string | null
  created_by?: DbId | null
  executed_by?: DbId | null
  executed_at?: string | null
  completed_at?: string | null
}

export type DbRunItem = {
  id: DbId
  run_id: DbId
  job_posting_id?: DbId | null
  result_status?: string | null
  updated_at?: string | null
}

export type DbTodo = {
  id: DbId
  org_id: DbId
  client_id?: DbId | null
  assigned_to?: DbId | null
  instructions?: string | null
  evidence_urls?: string[] | null
  completed_at?: string | null
}

export type DbAuditLog = {
  id: DbId
  org_id: DbId
  actor_user_id?: DbId | null
  target_table?: string | null
  target_id?: DbId | null
  detail?: unknown
}

export type DbClientMeeting = {
  id: DbId
  client_id: DbId
  org_id?: DbId | null
  title?: string | null
  memo?: string | null
  meeting_date?: string | null
}
