"use client"

import { ErrorState } from "@/components/ui/ErrorState"

export default function Error() {
  return (
    <main className="min-h-screen bg-[#F9F9F9] p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <ErrorState />
      </div>
    </main>
  )
}
