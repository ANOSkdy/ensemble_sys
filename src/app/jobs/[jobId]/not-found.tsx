export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="text-lg font-semibold text-slate-800">データが見つかりません</div>
        <p className="mt-2 text-sm text-slate-500">対象のIDが存在しないか、参照できません。</p>
      </div>
    </main>
  )
}