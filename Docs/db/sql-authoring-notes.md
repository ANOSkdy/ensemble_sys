# Implementation Notes for SQL Authors

Use actual DB column names in SQL.

Examples:
- select org_id from users
- select owner_name, memo from clients
- select login_secret_encrypted from channel_accounts
- select internal_title from jobs
- select file_format, file_sha256 from runs
- select actor_user_id from audit_logs
- use client_meetings instead of meetings

If UI/domain naming prefers friendlier aliases, map them in TypeScript after query execution.
