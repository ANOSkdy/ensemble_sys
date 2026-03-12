export function ProcessFlow() {
  const steps = [
    "Meeting",
    "AI Proposal",
    "Approval",
    "Run Create",
    "Upload",
    "Import Results",
  ]

  return (
    <div className="grid gap-3 md:grid-cols-6">
      {steps.map((step) => (
        <div key={step} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-medium">{step}</div>
        </div>
      ))}
    </div>
  )
}
