export type ProposalDiffItem = {
  field: string
  before: string
  after: string
  reason: string
}

export type ProposalOutput = {
  summary: string
  proposedFields: {
    headline: string
    jobDescription: string
    requirements: string
    benefits: string
    workingHours: string
    salary: string
  }
  diff: ProposalDiffItem[]
  riskFlags: string[]
}