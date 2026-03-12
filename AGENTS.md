# AGENTS.md

## 1. Purpose

This repository implements an operational console for the following workflow:

- manage Airwork job data in Neon Postgres as the single source of truth
- generate AI-assisted improvement proposals from meeting notes
- approve or reject structured proposals
- generate bulk update files for Airwork in Excel/TSV formats
- support run execution, evidence capture, result import, and follow-up ToDos
- detect freshness targets after 14 days and create repeatable operational tasks

All agent work in this repository must prioritize safe, reviewable, minimal-diff changes that preserve deployability on Vercel.

---

## 2. Product Scope

In scope:

- CRM for clients, channels, locations, and operation notes
- Job master and revision management
- AI proposal generation and structured review flow
- Run creation and file generation for Airwork bulk operations
- Result import and error visualization
- Freshness detection and ToDo generation
- UI implementation aligned to the frozen design specification

Out of scope unless explicitly requested:

- browser automation or RPA for Airwork admin screens
- bulk automation for non-Airwork media
- redesigning the brand or introducing multiple visual themes
- large architectural rewrites for style or preference only

---

## 3. System Constraints

Stack constraints:

- Next.js App Router
- TypeScript
- Tailwind CSS
- pnpm
- Vercel deployment
- Neon Postgres as primary DB
- Vercel Blob for generated files, imported files, and evidence
- Gemini Flash on the server side only

Runtime constraints:

- default runtime for DB-backed code is `nodejs`
- DB access, Blob access, and AI calls are server-only
- do not move secret-bearing logic to client components

Environment variable constraints:

- use Vercel-managed environment variables
- keep only `.env.example` in the repository
- expected server-side env vars include:
  - `DATABASE_URL`
  - `DATABASE_URL_UNPOOLED`
  - `NEON_DATABASE_URL`
  - `BLOB_READ_WRITE_TOKEN`
  - `GEMINI_API_KEY`

---

## 4. Source of Truth Order

When implementing changes, use the following priority:

1. explicit user request
2. this `AGENTS.md`
3. `Docs/design/basic-design-v2.md`
4. `Docs/design/detailed-design-v2.md`
5. current production-safe repository behavior
6. framework defaults

If documents and current code conflict:

- prefer the implementation that is safer for runtime and deployment
- do not silently rewrite business logic without explicit instruction
- keep changes narrow and note assumptions in the response when necessary

---

## 5. Core Development Principles

1. Make the smallest possible change that fully solves the task.
2. Prefer additive changes over destructive rewrites.
3. Do not refactor unrelated files.
4. Do not rename, reformat, or reorganize files without a clear need.
5. Keep every change easy to review as a unified diff.
6. Preserve Vercel build compatibility and local development compatibility.
7. Prefer explicit, deterministic code over clever abstractions.
8. If a change could affect business behavior, keep the implementation conservative.

---

## 6. Repository Structure Rules

### Routing and pages
- `src/app/**`
- Place pages, layouts, route handlers, and route-local UI here.

### API routes
- `src/app/api/**`
- Route handlers must stay thin.
- Put validation and reusable business logic in `src/lib/**`.

### Shared UI
- `src/components/**`
- Shared presentation and interactive components only.
- No DB credentials, no secret-dependent logic.

### Shared libraries
- `src/lib/db/**` for database access
- `src/lib/validators/**` for Zod schemas and validation helpers
- `src/lib/auth/**` for authentication and authorization helpers
- `src/lib/ai/**` for Gemini integration
- `src/lib/blob/**` for Vercel Blob integration
- `src/lib/tokens/**` for design tokens and visual constants
- `src/lib/utils/**` for generic helpers

### Types
- `src/types/**`
- Shared domain and API response types only.

### Documentation
- `Docs/**`
- Keep design, API, DB, and UI documentation here.
- Never store secrets or sensitive exports in docs.

---

## 7. Route and Screen Responsibilities

The repository is expected to support at least the following route groups.

### Authentication
- `/login`
- `/logout`

### Dashboard
- `/`
- show summary cards for open ToDos, recent runs, and freshness targets

### CRM
- `/clients`
- `/clients/[clientId]`
- `/clients/[clientId]/channels`
- `/clients/[clientId]/locations`

### Jobs
- `/jobs`
- `/clients/[clientId]/jobs`
- `/jobs/[jobId]`
- `/jobs/[jobId]/edit`
- `/jobs/[jobId]/revisions`
- `/jobs/[jobId]/revisions/[revId]`

### AI Proposals
- `/meetings`
- `/meetings/new`
- `/jobs/[jobId]/ai`
- `/jobs/[jobId]/ai/[proposalId]`

### Runs
- `/runs`
- `/runs/[runId]`
- `/runs/[runId]/preview`

### ToDos
- `/todos`
- `/todos/[todoId]`

### Settings / Masters
- `/settings/airwork-fields`
- `/settings/airwork-codes`
- `/settings/users`
- `/settings/audit`

When adding features, follow these route responsibilities instead of inventing parallel flows.

---

## 8. UI Layout Rules

Use the frozen design specification as the base standard.

### Visual design is frozen
Do not introduce a different theme unless explicitly requested.

### Color palette
- Base: `#F9F9F9`
- Primary: `#4A90E2`
- Secondary: `#50E3C2`
- Accent-1: `#FFD166`
- Accent-2: `#F25F5C`
- Accent-3: `#9D59EC`

### Semantic usage
- primary for main CTA, selection, review/executing states
- secondary for success and approved/done states
- accent-1 for warning and highlight
- accent-2 for error, danger, blocked, unresolved states
- accent-3 for AI proposal and AI analysis affordances

### Layout rules
- clearly separate sections using cards or panels
- dashboard and detail screens should maintain obvious visual hierarchy
- prefer summary at the top, details below
- primary actions belong at section top-right or a sticky footer area
- use left-to-right process flow on desktop and top-to-bottom on narrow layouts
- charts must be flat bar or flat pie only
- transitions must remain modest and short

### Component styling rules
- soft drop shadows only
- medium to large card radii
- labels always visible on forms
- errors shown directly under related fields
- avoid visually loud motion or blinking

---

## 9. Shared Component Rules

Preferred shared components include:

- `PageHeader`
- `SectionCard`
- `StatCard`
- `FilterBar`
- `StatusBadge`
- `EmptyState`
- `ErrorBanner`
- `HelpPanel`
- `ProcessFlow`
- `DiffViewer`
- `DataChart`

When implementing screens:

- reuse shared components before introducing new patterns
- keep props simple and explicit
- avoid embedding business rules in presentational components

### StatusBadge contract
Supported status values:

- `draft`
- `in_review`
- `approved`
- `applied`
- `executing`
- `done`
- `failed`
- `blocked`
- `ai`

### DiffViewer contract
Use for:

- AI proposal diffs
- revision diffs
- pre-output diffs

Visual contract:

- left column is before
- right column is after
- added content uses positive/secondary emphasis
- removed content uses error emphasis
- AI-originated content can carry accent-3 labeling

### ProcessFlow contract
Use for:

- meeting → AI proposal → approval → run generation → upload → result import
- freshness maintenance flow

Desktop orientation is horizontal first.

---

## 10. Database Rules

Primary database is Neon Postgres.

Mandatory rules:

- server-side access only
- parameterized SQL only
- validate all untrusted input before query execution
- keep queries explicit and reviewable
- default DB-backed routes to `export const runtime = "nodejs"`
- do not introduce DB access in client components
- do not log full SQL connection strings or secrets

When editing DB code:

- prefer helpers under `src/lib/db/**`
- keep route handlers focused on request parsing, authorization, and response formatting
- do not perform schema redesigns without explicit approval

Airwork-specific constraints:

- `job_offer_id` determines new vs update behavior and must be handled carefully
- code values must be stored as strings, not coerced to numbers
- non-importable Airwork fields may exist as reference cache and must not be overwritten during file generation
- large updates may require Run splitting by client, medium, date, and type

---

## 11. Validation Rules

Use Zod for all external input.

Validate:

- request body
- route params
- search params
- enum-like values
- dates
- IDs
- bulk-operation options

Rules:

- reject malformed input early
- never trust client-provided identifiers
- do not pass unchecked values into SQL or file-generation logic
- keep reusable schemas in `src/lib/validators/**`

---

## 12. API Design Rules

API routes should:

- stay small and explicit
- return consistent JSON shapes
- avoid leaking implementation details
- separate validation, domain logic, and output formatting

Preferred response pattern:

- success: `{ ok: true, ... }`
- failure: `{ ok: false, error: "..." }`

Do not:

- return raw stack traces to clients
- mix HTML/UI concerns into API contracts
- silently swallow operational failures

---

## 13. Auth and Security Rules

- keep auth and authorization checks server-side
- do not trust client state for access control
- protect sensitive routes and admin operations
- sanitize logs
- do not expose secrets through `NEXT_PUBLIC_*` unless intentionally public
- do not place DB secrets, blob tokens, or AI keys in client bundles

If authentication is incomplete in a target area:

- do not redesign the entire auth model unless requested
- add the smallest safe guardrail consistent with the task

---

## 14. File Generation and Run Rules

This repository supports run-based operational execution.

Implementation expectations:

- Run entities represent generated update batches
- generated files and evidence are stored via Vercel Blob
- generated files must remain traceable to actor, time, and scope
- result import should map errors back to job-level actionable items
- evidence capture should support operation notes and attachments where required

Run UI expectations:

- Run summary at top
- target list, validation result, generated file, and execution steps in distinct sections
- evidence and import result areas placed below operational summary

---

## 15. Freshness Automation Rules

Freshness logic is part of the core product.

Rules:

- detect jobs older than 14 days as freshness targets
- create operational ToDos rather than inventing unsupported auto-publish flows
- keep freshness automation auditable and reviewable
- do not collapse manual steps that Airwork bulk import cannot safely automate

---

## 16. AI Integration Rules

Gemini usage must remain server-side.

AI proposal flow expectations:

- source inputs may include meeting notes, current job content, and constraints
- output should be structured and reviewable
- proposal screen should show summary, before/after diff, risk checks, and human questions
- support adopt, reject, or partial-adopt flows

Do not:

- call AI directly from client code with secret keys
- treat AI output as trusted without validation or review
- auto-apply speculative AI changes to production-critical records without explicit approval flow

---

## 17. Documentation Rules

When behavior, architecture, API shape, or DB assumptions change, update relevant docs.

Primary documentation locations:

- `Docs/design/`
- `Docs/api/`
- `Docs/db/`
- `Docs/ui/`

Documentation rules:

- prefer updating existing docs over duplicating them
- keep docs implementation-relevant
- do not add ornamental docs with no maintenance value

---

## 18. Dependency Rules

- use `pnpm`
- add only dependencies required for the requested task
- do not replace core libraries without explicit approval
- do not modify lockfiles unless dependency changes require it
- avoid introducing heavy state management or broad frameworks unless justified by the task

---

## 19. Testing and Verification Rules

Before finishing a change, run the smallest relevant checks.

Default checks:

```bash
pnpm exec tsc --noEmit
pnpm lint
```

When applicable:

- run targeted route or feature verification
- run local dev server with `pnpm dev`
- verify DB-backed behavior safely

For logic-heavy code, add or update focused tests where practical.

Do not introduce large test harnesses unless explicitly requested.

---

## 20. Change Scope Rules

Safe-by-default changes:

- additive route handlers
- focused UI components
- validation improvements
- DB helper additions
- targeted bug fixes
- documentation updates
- `.env.example` updates

Needs explicit approval:

- auth redesign
- schema redesign
- framework migration
- major library replacement
- large directory restructuring
- widespread naming changes
- design theme changes

---

## 21. Commit and Diff Rules

Diff rules:

- one focused change per task when possible
- no unrelated formatting churn
- no broad cleanup outside task scope
- preserve readability and reviewability

Commit message style:

- `feat:`
- `fix:`
- `chore:`
- `docs:`
- `refactor:` only for real refactors

Examples:

- `feat: add run preview summary section`
- `fix: validate job offer id before file generation`
- `docs: align agent rules with design freeze`

---

## 22. Codex Execution Rules

When acting as an implementation agent:

- preserve current architecture unless the task clearly requires change
- prefer unified diffs
- keep output automation-friendly
- avoid long prose when code changes are requested
- make assumptions explicit only when they affect correctness

For code generation:

- preserve server-only secret handling
- preserve Neon/Vercel compatibility
- preserve App Router structure
- keep runtime-safe defaults

---

## 23. Pre-Completion Checklist

Before considering work complete, confirm:

- the requested task is actually solved
- the diff is minimal
- design freeze is respected
- secrets remain server-only
- DB access remains server-side only
- input validation exists where needed
- typecheck is expected to pass
- lint is expected to pass
- related docs were updated if behavior changed

---

## 24. Local Development Commands

Default commands:

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm lint
pnpm dev
```

Optional health verification:

- `/api/db-health`

---

## 25. Final Rule

When there is a choice between:

- faster but riskier change
- slightly slower but safer and more reviewable change

always choose the safer and more reviewable change.
