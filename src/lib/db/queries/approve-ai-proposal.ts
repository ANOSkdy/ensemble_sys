import "server-only"
import { getAiProposalDetail } from "@/lib/db/queries/get-ai-proposal-detail"

export type ApproveAiProposalInput = {
  proposal_id: string
}

export async function approveAiProposal(
  input: ApproveAiProposalInput,
): Promise<Awaited<ReturnType<typeof getAiProposalDetail>>> {
  return getAiProposalDetail({ id: input.proposal_id })
}
