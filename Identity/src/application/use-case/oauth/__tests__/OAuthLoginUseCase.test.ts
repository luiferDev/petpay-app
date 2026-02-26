import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { OAuthLoginUseCase } from '../OAuthLoginUseCase'
import { OAuthStateManager } from '../../../../infrastructure/services/OAuthStateManager'
import { OAuthInvalidStateError } from '../../../../domain/errors/OAuthError'
import type { IOAuthProvider, OAuthUserProfile, OAuthTokens } from '../../../ports/IOAuthProvider'
import type { ITokenProvider } from '../../../ports/ITokenService'
import type { IOAuthUserRepository } from '../../../ports/IOAuthUserRepository'
import type { IUserRepository } from '../../../../domain/repositories/IUserRepository'
import type { User } from '../../../../domain/entities/User'

const TEST_SECRET = 'this-is-a-very-secure-secret-key-32chars!'

describe('OAuthLoginUseCase', () => {
  let oauthLoginUseCase: OAuthLoginUseCase
  let stateManager: OAuthStateManager
  let mockExchangeCodeForTokens: any
  let mockGetUserProfile: any
  let mockFindByProviderAndId: any
  let mockFindByEmail: any
  let mockSave: any
  let mockGenerateTokensForOAuthUser: any

  beforeEach(() => {
    stateManager = new OAuthStateManager(TEST_SECRET)

    mockExchangeCodeForTokens = vi.fn()
    mockGetUserProfile = vi.fn()
    mockFindByProviderAndId = vi.fn()
    mockFindByEmail = vi.fn()
    mockSave = vi.fn()
    mockGenerateTokensForOAuthUser = vi.fn(() => ({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }))

    const mockOAuthProvider: IOAuthProvider = {
      providerName: 'google',
      getAuthorizationUrl: vi.fn((state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`),
      exchangeCodeForTokens: mockExchangeCodeForTokens,
      getUserProfile: mockGetUserProfile
    }

    const mockTokenProvider: ITokenProvider = {
      generateTokens: vi.fn(),
      generateTokensForOAuthUser: mockGenerateTokensForOAuthUser,
      verifyToken: vi.fn()
    }

    const mockOAuthUserRepository: IOAuthUserRepository = {
      create: vi.fn(),
      findByProviderAndId: mockFindByProviderAndId,
      updateTokens: vi.fn(),
      delete: vi.fn()
    }

    const mockUserRepository: IUserRepository = {
      findById: vi.fn(),
      findByEmail: mockFindByEmail,
      save: mockSave,
      update: vi.fn(),
      delete: vi.fn()
    }

    oauthLoginUseCase = new OAuthLoginUseCase(
      mockOAuthProvider,
      mockOAuthUserRepository,
      mockUserRepository,
      mockTokenProvider,
      stateManager
    )
  })

  describe('Happy Path', () => {
    it('should login successfully with valid signed state', async () => {
      const state = stateManager.generateState()

      const mockTokens: OAuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600
      }

      const mockProfile: OAuthUserProfile = {
        provider: 'google',
        providerId: '123456789',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['CLIENT'],
        isVerified: true,
        passwordHash: 'mock-hash'
      }

      mockExchangeCodeForTokens.mockResolvedValue(mockTokens)
      mockGetUserProfile.mockResolvedValue(mockProfile)
      mockFindByProviderAndId.mockResolvedValue(null)
      mockFindByEmail.mockResolvedValue(null)
      mockSave.mockResolvedValue({ ...mockUser, id: 'user-123' })

      const result = await oauthLoginUseCase.execute({
        provider: 'google',
        code: 'auth-code',
        state,
        cookieState: state
      })

      expect(result).toBeDefined()
      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(result.user.email).toBe('test@example.com')
      expect(mockExchangeCodeForTokens).toHaveBeenCalledWith('auth-code')
      expect(mockGetUserProfile).toHaveBeenCalledWith('mock-access-token')
    })
  })

  describe('Error Paths', () => {
    it('should throw error with invalid signature', async () => {
      const validState = stateManager.generateState()
      const invalidState = validState.slice(0, -10) + 'aaaaaaaaaa'

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: invalidState,
          cookieState: invalidState
        })
      ).rejects.toThrow(OAuthInvalidStateError)

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: invalidState,
          cookieState: invalidState
        })
      ).rejects.toThrow('Invalid state signature')
    })

    it('should throw error with expired state', async () => {
      const oldTimestamp = Date.now() - (11 * 60 * 1000)
      const random = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const data = `${oldTimestamp}:${random}`
      const signature = require('crypto').createHmac('sha256', TEST_SECRET).update(data).digest('hex')
      const expiredState = `${oldTimestamp}:${random}:${signature}`

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: expiredState,
          cookieState: expiredState
        })
      ).rejects.toThrow(OAuthInvalidStateError)

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: expiredState,
          cookieState: expiredState
        })
      ).rejects.toThrow('State parameter has expired')
    })

    it('should throw error with missing cookie state', async () => {
      const state = stateManager.generateState()

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state,
          cookieState: ''
        })
      ).rejects.toThrow(OAuthInvalidStateError)

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state,
          cookieState: ''
        })
      ).rejects.toThrow('Missing state parameter')
    })

    it('should throw error when state is missing from request', async () => {
      const state = stateManager.generateState()

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: '',
          cookieState: state
        })
      ).rejects.toThrow(OAuthInvalidStateError)
    })

    it('should throw error with state mismatch', async () => {
      const state1 = stateManager.generateState()
      const state2 = stateManager.generateState()

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: state1,
          cookieState: state2
        })
      ).rejects.toThrow(OAuthInvalidStateError)

      await expect(
        oauthLoginUseCase.execute({
          provider: 'google',
          code: 'auth-code',
          state: state1,
          cookieState: state2
        })
      ).rejects.toThrow('State mismatch between request and cookie')
    })
  })
})
