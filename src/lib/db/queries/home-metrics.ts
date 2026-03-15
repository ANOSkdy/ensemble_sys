import "server-only"
import { sql } from "@/lib/db/client"

export type HomeMetrics = {
  openTodos: number
  inProgressTodos: number
  activeJobs: number
  archivedJobs: number
  draftRuns: number
  executingRuns: number
  doneRuns: number
  failedRuns: number
  refreshCandidates: number
}

export async function getHomeMetrics(): Promise<HomeMetrics> {
  const todoRows = await sql`
    select
      count(*) filter (where status = 'open')::int as open_todos,
      count(*) filter (where status = 'in_progress')::int as in_progress_todos
    from todos
  `

  const jobRows = await sql`
    select
      count(*) filter (where status = 'active')::int as active_jobs,
      count(*) filter (where status = 'archived')::int as archived_jobs
    from jobs
  `

  const runRows = await sql`
    select
      count(*) filter (where status = 'draft')::int as draft_runs,
      count(*) filter (where status = 'executing')::int as executing_runs,
      count(*) filter (where status = 'done')::int as done_runs,
      count(*) filter (where status = 'failed')::int as failed_runs
    from runs
  `

  const postingRows = await sql`
    select
      count(*) filter (where is_refresh_candidate = true)::int as refresh_candidates
    from job_postings
  `

  const todo = todoRows[0] as {
    open_todos: number
    in_progress_todos: number
  }

  const job = jobRows[0] as {
    active_jobs: number
    archived_jobs: number
  }

  const run = runRows[0] as {
    draft_runs: number
    executing_runs: number
    done_runs: number
    failed_runs: number
  }

  const posting = postingRows[0] as {
    refresh_candidates: number
  }

  return {
    openTodos: todo.open_todos ?? 0,
    inProgressTodos: todo.in_progress_todos ?? 0,
    activeJobs: job.active_jobs ?? 0,
    archivedJobs: job.archived_jobs ?? 0,
    draftRuns: run.draft_runs ?? 0,
    executingRuns: run.executing_runs ?? 0,
    doneRuns: run.done_runs ?? 0,
    failedRuns: run.failed_runs ?? 0,
    refreshCandidates: posting.refresh_candidates ?? 0,
  }
}
