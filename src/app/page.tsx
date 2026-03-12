export default function HomePage() {
  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">Open ToDos</div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">Recent Runs</div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">Freshness Targets</div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">Freshness Candidates</div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">Recent Run Summary</div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">Pending Tasks</div>
        </section>
      </div>
    </main>
  )
}
