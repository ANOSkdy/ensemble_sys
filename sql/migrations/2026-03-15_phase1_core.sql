-- ============================================
-- Phase 1 core draft migration
-- Review before applying to production
-- ============================================

-- client_meetings
alter table client_meetings
  add column if not exists title text,
  add column if not exists raw_text text,
  add column if not exists meeting_at timestamptz;

-- ai_proposals
alter table ai_proposals
  add column if not exists status text,
  add column if not exists proposal_json jsonb,
  add column if not exists diff_json jsonb,
  add column if not exists risk_flags_json jsonb;

-- job_revisions
alter table job_revisions
  add column if not exists content_json jsonb;

-- job_postings
alter table job_postings
  add column if not exists current_revision_id uuid,
  add column if not exists last_published_revision_id uuid;
