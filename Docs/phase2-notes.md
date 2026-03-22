# Phase 2 Notes

Implemented:
- GET /api/clients
- GET /api/jobs
- GET /api/runs
- GET /api/todos
- list pages for clients, jobs, runs, todos
- shared list rendering with DataTable / EmptyState / ErrorState / StatusBadge

Read model policy:
- actual Neon schema first
- no write operations in this phase
- pages focus on list rendering and DB alignment validation

Exit criteria:
- list pages render with live DB data
- typecheck passes
- lint passes
