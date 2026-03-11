import { z } from 'zod'

/**
 * Schema for logout request.
 */
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional()
})

export type LogoutInput = z.infer<typeof logoutSchema>
