"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/ui/SectionCard"

const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111"

export default function NewClientPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    org_id: DEFAULT_ORG_ID,
    name: "",
    industry: "",
    owner_name: "",
    notes: "",
    timezone: "Asia/Tokyo",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok || !json.ok) {
      setError(json.error ?? "failed to create client")
      setSubmitting(false)
      return
    }

    router.push(`/clients/${json.data.id}`)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="New Client" description="Create a new client." />

        <SectionCard>
          <form onSubmit={onSubmit} className="space-y-4">
            <input className="w-full rounded-2xl border p-3" placeholder="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full rounded-2xl border p-3" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            <input className="w-full rounded-2xl border p-3" placeholder="Owner name" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            <textarea className="w-full rounded-2xl border p-3" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <input className="w-full rounded-2xl border p-3" placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <button disabled={submitting} className="rounded-2xl bg-[#4A90E2] px-5 py-3 text-white disabled:opacity-60">
              {submitting ? "Creating..." : "Create Client"}
            </button>
          </form>
        </SectionCard>
      </div>
    </main>
  )
}
