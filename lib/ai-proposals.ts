import { z } from "zod";

export const editableFieldKeys = [
  "title",
  "subtitle",
  "description",
  "job_type"
] as const;

export const aiProposalSchema = z.object({
  summary: z.string().trim().min(1),
  changes: z.array(
    z.object({
      field_key: z.enum(editableFieldKeys),
      after: z.string().trim().min(1),
      reason: z.string().trim().min(1)
    })
  ),
  risk_checks: z.array(
    z.object({
      type: z.string().trim().min(1),
      message: z.string().trim().min(1)
    })
  ),
  questions_for_human: z.array(z.string().trim().min(1))
});

export type AiProposalOutput = z.infer<typeof aiProposalSchema>;
