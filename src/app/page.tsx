import { PageHeader } from "@/components/layout/PageHeader"
import { SummaryCard } from "@/components/ui/SummaryCard"
import { SectionCard } from "@/components/ui/SectionCard"
import { StatusBadge } from "@/components/ui/StatusBadge"

const cards = [
  { title: "Open ToDos", value: "12", hint: "未完了タスク" },
  { title: "Recent Runs", value: "4", hint: "直近実行件数" },
  { title: "Freshness Targets", value: "9", hint: "更新候補" },
  { title: "Freshness Candidates", value: "6", hint: "要確認案件" },
  { title: "Recent Run Summary", value: "OK", hint: "最新実行状態" },
  { title: "Pending Tasks", value: "3", hint: "対応待ち" },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          title="Airwork Ops Console"
          description="Airワーク運用、AI提案、Run、ToDo を一元管理するオペレーションコンソール"
          actions={<StatusBadge label="Phase 1" status="in_review" />}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <SummaryCard
              key={card.title}
              title={card.title}
              value={card.value}
              hint={card.hint}
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Operations Overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  今後ここに一覧、フロー、集計を接続します。
                </p>
              </div>
              <StatusBadge label="Scaffold" status="draft" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Clients</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jobs</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Runs / ToDos</div>
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="text-lg font-semibold text-slate-800">Design Notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              <li>・セクションを明確に区分</li>
              <li>・柔らかいドロップシャドウ</li>
              <li>・控えめなトランジション</li>
              <li>・プライマリ / セカンダリ / アクセント色を今後反映</li>
            </ul>
          </SectionCard>
        </section>
      </div>
    </main>
  )
}
