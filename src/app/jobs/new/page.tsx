"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/ui/SectionCard"

const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111"
const DEFAULT_CLIENT_ID = "30000000-0000-0000-0000-000000000001"

export default function NewJobPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    org_id: DEFAULT_ORG_ID,
    client_id: DEFAULT_CLIENT_ID,
    internal_title: "",
    status: "active",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok || !json.ok) {
      setError(json.error ?? "failed to create job")
      setSubmitting(false)
      return
    }

    router.push(`/jobs/${json.data.id}`)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="New Job" description="Create a new job." />

        <SectionCard>
          <form onSubmit={onSubmit} className="space-y-4">
            <input className="w-full rounded-2xl border p-3" placeholder="Job title" value={form.internal_title} onChange={(e) => setForm({ ...form, internal_title: e.target.value })} />
            <input className="w-full rounded-2xl border p-3" placeholder="Client ID" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
            <select className="w-full rounded-2xl border p-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <button disabled={submitting} className="rounded-2xl bg-[#4A90E2] px-5 py-3 text-white disabled:opacity-60">
              {submitting ? "Creating..." : "Create Job"}
            </button>
          </form>
        </SectionCard>
      </div>
    </main>
  )
}
