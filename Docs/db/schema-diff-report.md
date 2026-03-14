# Schema Diff Report

Generated at: 2026-03-14T05:09:40.455Z

## Missing Tables
- public.meetings

## Extra Tables
- public.client_meetings
- public.schema_migrations

## Missing Columns
- public.users.organization_id
- public.users.name
- public.clients.organization_id
- public.clients.contact_name
- public.channel_accounts.encrypted_secret
- public.channel_accounts.notes
- public.airwork_fields.constraints
- public.airwork_locations.name
- public.airwork_locations.is_active
- public.jobs.title
- public.jobs.notes
- public.job_postings.channel_account_id
- public.job_postings.publish_status
- public.ai_proposals.job_revision_id
- public.ai_proposals.status
- public.ai_proposals.applied_revision_id
- public.ai_proposals.created_by
- public.runs.format
- public.runs.sha256
- public.runs.executed_by
- public.runs.executed_at
- public.runs.completed_at
- public.run_items.result_status
- public.run_items.updated_at
- public.todos.evidence_url
- public.todos.notes
- public.todos.assigned_to
- public.todos.completed_at
- public.audit_logs.organization_id
- public.audit_logs.user_id
- public.audit_logs.before_json
- public.audit_logs.after_json

## Extra Columns
- public.users.org_id
- public.clients.org_id
- public.clients.owner_name
- public.channel_accounts.org_id
- public.channel_accounts.login_secret_encrypted
- public.channel_accounts.memo
- public.airwork_fields.value_constraints
- public.airwork_locations.org_id
- public.airwork_locations.name_ja
- public.airwork_locations.memo
- public.jobs.org_id
- public.jobs.internal_title
- public.job_postings.org_id
- public.job_postings.channel
- public.job_postings.publish_status_cache
- public.job_revisions.org_id
- public.job_revisions.rev_no
- public.job_revisions.source
- public.ai_proposals.org_id
- public.ai_proposals.thinking_level
- public.runs.org_id
- public.runs.channel
- public.runs.file_format
- public.runs.file_sha256
- public.runs.created_by
- public.todos.org_id
- public.todos.instructions
- public.todos.evidence_urls
- public.audit_logs.org_id
- public.audit_logs.actor_user_id
- public.audit_logs.detail

## Missing Primary Keys
- none

## Missing Unique Constraints
- none

## Missing Foreign Keys
- public.ai_proposals.meeting_id -> meetings.id

## Mismatched Columns
- public.users.email [type] expected=text, actual=citext
- public.airwork_codes.name_ja [nullable] expected=not null, actual=nullable
