import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { RefreshTokenUseCase } from '../RefreshTokenUseCase'
import { TokenNotFoundError, InvalidTokenError } from '../../../../domain/errors/DomainError'
import type { ITokenService } from '../../../../application/ports/ITokenService'
import type { IRedisService } from '../../../../application/ports/IRedisService'
import type { IUserRepository } from '../../../../domain/repositories/IUserRepository'

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase: RefreshTokenUseCase
  let mockTokenService: Partial<ITokenService>
  let mockRedisService: Partial<IRedisService>
  let mockUserRepository: Partial<IUserRepository>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTokenService = {
      verifyRefreshToken: vi.fn(),
      generateTokensWithTokenId: vi.fn()
    }

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn()
    }

    mockUserRepository = {
      findById: vi.fn()
    }

    refreshTokenUseCase = new RefreshTokenUseCase(
      mockTokenService as ITokenService,
      mockRedisService as IRedisService,
      mockUserRepository as IUserRepository
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
        refreshTokenUseCase.execute({ refreshToken: mockRefreshToken })
      ).rejects.toThrow(InvalidTokenError)
    })

    it('should throw TokenNotFoundError when token not in Redis', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(mockPayload as any)
      vi.mocked(mockRedisService.get).mockResolvedValue(null)

      await expect(
        refreshTokenUseCase.execute({ refreshToken: mockRefreshToken })
      ).rejects.toThrow(TokenNotFoundError)
    })

    it('should throw TokenNotFoundError when user not found', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(mockPayload as any)
      vi.mocked(mockRedisService.get).mockResolvedValue(mockRefreshToken)
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null)

      await expect(
        refreshTokenUseCase.execute({ refreshToken: mockRefreshToken })
      ).rejects.toThrow(TokenNotFoundError)
    })

    it('should return new tokens on successful refresh', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        roles: ['CLIENT']
      }
      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenId: 'new-token-uuid'
      }

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(mockPayload as any)
      vi.mocked(mockRedisService.get).mockResolvedValue(mockRefreshToken)
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser as any)
      vi.mocked(mockTokenService.generateTokensWithTokenId).mockReturnValue(mockNewTokens as any)
      vi.mocked(mockRedisService.delete).mockResolvedValue(undefined)
      vi.mocked(mockRedisService.set).mockResolvedValue(undefined)

      const result = await refreshTokenUseCase.execute({ refreshToken: mockRefreshToken })

      expect(result.accessToken).toBe('new-access-token')
      expect(result.refreshToken).toBe('new-refresh-token')
      expect(mockRedisService.delete).toHaveBeenCalled()
      expect(mockRedisService.set).toHaveBeenCalled()
    })
  })
})
