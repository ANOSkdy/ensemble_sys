import {
  AI_PROPOSAL_STATUSES,
  type AiProposalStatus,
} from "@/lib/constants/db-enums"

export const AI_PROPOSAL_INITIAL_STATUS: AiProposalStatus = "generated"

const transitionMap: Record<AiProposalStatus, readonly AiProposalStatus[]> = {
  generated: ["approved", "rejected"],
  approved: ["applied"],
  rejected: [],
  applied: [],
}

export function isAiProposalStatus(value: string): value is AiProposalStatus {
  return AI_PROPOSAL_STATUSES.includes(value as AiProposalStatus)
}

export function canTransitionAiProposalStatus(
  from: AiProposalStatus,
  to: AiProposalStatus,
): boolean {
  if (from === to) {
    return true
  }

  return transitionMap[from].includes(to)
}
