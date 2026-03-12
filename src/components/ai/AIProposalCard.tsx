export function AIProposalCard() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex rounded-full bg-[#9D59EC]/15 px-3 py-1 text-xs font-medium text-[#9D59EC]">AI</div>
      <div className="space-y-3">
        <div>summary</div>
        <div>changes</div>
        <div>risk_checks</div>
        <div>questions_for_human</div>
      </div>
    </div>
  )
}
