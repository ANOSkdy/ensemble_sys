# Actual DB Mapping Notes

This file summarizes the major differences between the original design naming and the live Neon schema.

## Confirmed naming mappings

| Design-side name | Actual DB name |
|---|---|
| organization_id | org_id |
| contact_name | owner_name |
| encrypted_secret | login_secret_encrypted |
| notes | memo |
| constraints | value_constraints |
| name | name_ja |
| title | internal_title |
| format | file_format |
| sha256 | file_sha256 |
| user_id (audit) | actor_user_id |

## Confirmed table mappings

| Design-side table | Actual DB table |
|---|---|
| meetings | client_meetings |

## Important implementation notes

- `users.email` is `citext` in DB and should be treated as case-insensitive.
- `airwork_codes.name_ja` is nullable in DB.
- `schema_migrations` exists and is expected.
- Current implementation work should target actual DB names before introducing domain aliases.
