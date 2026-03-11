import z from 'zod'

export const loginSchema = z.object({
  email: z.email(),
  passwordHash: z.string().min(8)
})

export type LoginInput = z.infer<typeof loginSchema>
