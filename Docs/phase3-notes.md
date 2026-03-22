# Phase 3 Notes

Implemented:
- detail APIs for clients, jobs, runs, todos
- detail pages for clients, jobs, runs, todos
- related data rendering
- not-found handling
- list-to-detail navigation

Policy:
- actual Neon schema first
- no write operations in this phase
- render related data conservatively based on currently confirmed columns

Exit criteria:
- detail pages render with live DB data
- invalid IDs show not found
- typecheck passes
- lint passes
