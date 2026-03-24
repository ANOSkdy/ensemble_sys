import { z } from "zod"
import {
  JOB_STATUSES,
  RUN_CHANNELS,
  RUN_FILE_FORMATS,
  RUN_TYPES,
} from "@/lib/constants/db-enums"

const postgresUuidSchema = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  "Invalid UUID format",
)
export const idParamSchema = z.object({
  id: z.string().uuid(),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export const clientCreateSchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  industry: z.string().max(200).nullable().optional(),
  owner_name: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
})

export const jobCreateSchema = z.object({
  org_id: z.string().uuid(),
  client_id: z.string().uuid(),
  internal_title: z.string().min(1).max(200),
  status: z.enum(JOB_STATUSES),
})

export const jobUpdateSchema = z.object({
  internal_title: z.string().min(1).max(200).optional(),
  status: z.enum(JOB_STATUSES).optional(),
})

export const todoUpdateSchema = z.object({
  status: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  instructions: z.string().max(5000).nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
})
export const meetingCreateSchema = z.object({
  org_id: postgresUuidSchema,
  client_id: postgresUuidSchema,
  held_at: z.string().datetime(),
  memo: z.string().min(1).max(20000),
  created_by: postgresUuidSchema,
})

export const proposalGenerateSchema = z.object({
  org_id: postgresUuidSchema,
  meeting_id: postgresUuidSchema,
  job_posting_id: postgresUuidSchema,
  thinking_level: z.enum(["standard", "deep"]).default("standard"),
  model: z.string().min(1).max(100).default("gemini-2.5-flash"),
})

export const proposalApproveSchema = z.object({
  org_id: postgresUuidSchema,
  proposal_id: postgresUuidSchema,
  approved_by: postgresUuidSchema,
})

export const queuePublishRunSchema = z.object({
  org_id: postgresUuidSchema,
  client_id: postgresUuidSchema,
  job_posting_id: postgresUuidSchema,
  job_revision_id: postgresUuidSchema,
  created_by: postgresUuidSchema,
  channel: z.enum(RUN_CHANNELS).default(RUN_CHANNELS[0]),
  run_type: z.enum(RUN_TYPES).default(RUN_TYPES[0]),
  file_format: z.enum(RUN_FILE_FORMATS).default(RUN_FILE_FORMATS[0]),
})

