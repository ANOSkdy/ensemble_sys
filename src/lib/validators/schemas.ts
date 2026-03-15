import { z } from "zod"

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
  status: z.enum(["active", "archived"]),
})

export const jobUpdateSchema = z.object({
  internal_title: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
})

export const todoUpdateSchema = z.object({
  status: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  instructions: z.string().max(5000).nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
})
