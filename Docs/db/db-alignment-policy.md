# DB Alignment Policy (Actual Neon Schema is Source of Truth)

This repository adopts the live Neon schema as the source of truth.

Reference files:
- `Docs/db/neon-live-schema-snapshot.json`
- `Docs/db/schema-diff-report.md`

## Decision
Use the current Neon database structure as canonical unless a future explicit migration is approved.

## Naming decisions
The following actual DB names are canonical:

- `org_id` instead of `organization_id`
- `owner_name` instead of `contact_name`
- `login_secret_encrypted` instead of `encrypted_secret`
- `memo` instead of `notes`
- `value_constraints` instead of `constraints`
- `name_ja` instead of `name`
- `internal_title` instead of `title`
- `channel` instead of `channel_account_id` where the DB currently models channel directly
- `publish_status_cache` instead of `publish_status`
- `file_format` instead of `format`
- `file_sha256` instead of `sha256`
- `actor_user_id` instead of `user_id` in audit logs
- `detail` instead of split `before_json` / `after_json` where the DB currently stores consolidated detail

## Table decisions
- `client_meetings` is the current canonical meeting-related table
- `schema_migrations` is an allowed operational table
- `meetings` is not assumed to exist unless introduced by approved migration

## Implementation guidance
- New code must use actual DB column names first
- If domain-level aliases are needed, map them in TypeScript only
- Do not invent new DB column names in SQL
- Do not silently assume design-doc field names when they differ from the DB
- Prefer explicit mapping helpers when converting DB rows to UI/domain models

## Follow-up rule
If future DB migrations intentionally normalize names, update:
- `Docs/design/basic-design-v2.md`
- `Docs/design/detailed-design-v2.md`
- `Docs/db/expected-schema.json`
- `src/lib/db/schema.ts`
- `src/types/db-schema.ts`
