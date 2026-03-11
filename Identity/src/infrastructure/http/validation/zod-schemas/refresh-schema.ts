import { z } from 'zod'

/**
 * Schema for refresh token request.
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
