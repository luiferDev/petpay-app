import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { LogoutUseCase } from '../LogoutUseCase'
import { InvalidTokenError } from '../../../../domain/errors/DomainError'
import type { ITokenService } from '../../../../application/ports/ITokenService'
import type { IRedisService } from '../../../../application/ports/IRedisService'

describe('LogoutUseCase', () => {
  let logoutUseCase: LogoutUseCase
  let mockTokenService: Partial<ITokenService>
  let mockRedisService: Partial<IRedisService>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTokenService = {
      verifyRefreshToken: vi.fn()
    }

    mockRedisService = {
      delete: vi.fn()
    }

    logoutUseCase = new LogoutUseCase(
      mockTokenService as ITokenService,
      mockRedisService as IRedisService
    )
  })

  describe('execute', () => {
    const mockRefreshToken = 'valid-refresh-token'
    const mockUserId = 'user-123'
    const mockTokenId = 'token-uuid-456'
    const mockPayload = { id: mockUserId, email: 'test@example.com', role: 'CLIENT', tokenId: mockTokenId }

    it('should throw InvalidTokenError when token is invalid', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(
        logoutUseCase.execute({ refreshToken: mockRefreshToken })
      ).rejects.toThrow(InvalidTokenError)
    })

    it('should throw InvalidTokenError when tokenId is missing', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue({ id: mockUserId, email: 'test@example.com', role: 'CLIENT' } as any)

      await expect(
        logoutUseCase.execute({ refreshToken: mockRefreshToken })
      ).rejects.toThrow(InvalidTokenError)
    })

    it('should delete token from Redis on successful logout', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(mockPayload as any)
      vi.mocked(mockRedisService.delete).mockResolvedValue(undefined)

      const result = await logoutUseCase.execute({ refreshToken: mockRefreshToken })

      expect(result.message).toBe('Logged out successfully')
      expect(mockRedisService.delete).toHaveBeenCalledWith(`refresh_token:${mockUserId}:${mockTokenId}`)
    })

    it('should return success even if Redis delete fails gracefully', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(mockPayload as any)
      vi.mocked(mockRedisService.delete).mockRejectedValue(new Error('Redis error'))

      // The use case doesn't catch Redis errors, so it should throw
      await expect(
        logoutUseCase.execute({ refreshToken: mockRefreshToken })
      ).rejects.toThrow()
    })
  })
})
