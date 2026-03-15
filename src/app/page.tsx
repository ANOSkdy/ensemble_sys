import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { SummaryCard } from "@/components/ui/SummaryCard"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { getHomeMetrics } from "@/lib/db/queries/home-metrics"

export default async function HomePage() {
  const metrics = await getHomeMetrics()

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          title="Airwork Ops Console"
          description="Operations dashboard connected to live Neon data."
          actions={<StatusBadge label="Phase 5" status="approved" />}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Open ToDos" value={String(metrics.openTodos)} hint="status = open" />
          <SummaryCard title="In Progress ToDos" value={String(metrics.inProgressTodos)} hint="status = in_progress" />
          <SummaryCard title="Active Jobs" value={String(metrics.activeJobs)} hint="status = active" />
          <SummaryCard title="Refresh Candidates" value={String(metrics.refreshCandidates)} hint="job_postings.is_refresh_candidate" />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Draft Runs" value={String(metrics.draftRuns)} hint="status = draft" />
          <SummaryCard title="Executing Runs" value={String(metrics.executingRuns)} hint="status = executing" />
          <SummaryCard title="Done Runs" value={String(metrics.doneRuns)} hint="status = done" />
          <SummaryCard title="Failed Runs" value={String(metrics.failedRuns)} hint="status = failed" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <SectionCard>
            <h2 className="text-lg font-semibold text-slate-800">Quick Access</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Link href="/clients" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                Open Clients
              </Link>
              <Link href="/jobs" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                Open Jobs
              </Link>
              <Link href="/runs" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                Open Runs
              </Link>
              <Link href="/todos" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                Open ToDos
              </Link>
              <Link href="/clients/new" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                Create Client
              </Link>
              <Link href="/jobs/new" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                Create Job
              </Link>
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="text-lg font-semibold text-slate-800">Operational Notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              <li>- Home metrics are backed by live DB data.</li>
              <li>- Job and Todo edit APIs are available.</li>
              <li>- Detailed pages are connected to actual Neon schema.</li>
              <li>- Remaining work should focus on business automation depth.</li>
            </ul>
          </SectionCard>
        </section>
      </div>
    </main>
  )
}
