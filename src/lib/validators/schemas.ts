import { z } from "zod"

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export const jobIdSchema = z.object({
  id: z.string().min(1),
})
