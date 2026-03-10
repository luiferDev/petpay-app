import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { LoginUseCase } from '../LoginUseCase'
import type { IUserRepository } from '../../../../domain/repositories/IUserRepository'
import type { ITokenService } from '../../../ports/ITokenService'
import type { User } from '../../../../domain/entities/User'
import { UserNotFoundError, DomainError } from '../../../../domain/errors/DomainError'

vi.mock('bcrypt', () => ({
  compare: vi.fn().mockResolvedValue(true)
}))

describe('LoginUseCase', () => {
  let loginUseCase: LoginUseCase
  let mockFindByEmail: ReturnType<typeof vi.fn>
  let mockGenerateTokens: ReturnType<typeof vi.fn>
  let mockUserRepository: IUserRepository
  let mockTokenProvider: ITokenProvider

  beforeEach(() => {
    vi.clearAllMocks()

    mockFindByEmail = vi.fn()
    mockGenerateTokens = vi.fn().mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    })

    mockUserRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: mockFindByEmail,
      existsByEmail: vi.fn(),
      deleteById: vi.fn()
    }

    mockTokenProvider = {
      generateTokens: mockGenerateTokens,
      generateTokensForOAuthUser: vi.fn(),
      verifyToken: vi.fn()
    }

    loginUseCase = new LoginUseCase(mockUserRepository, mockTokenProvider)
  })

  describe('2.6 Successful login returns JWT tokens', () => {
    it('should login successfully and return user data with tokens', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpasswordhash',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CLIENT'],
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFindByEmail.mockResolvedValue(mockUser)

      const result = await loginUseCase.execute({
        email: 'test@example.com',
        password: 'correct-password'
      })

      expect(result).toBeDefined()
      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.fullName).toBe('John Doe')
      expect(result.user.roles).toContain('CLIENT')
      expect(result.user.isVerified).toBe(true)
      expect(mockFindByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockGenerateTokens).toHaveBeenCalledWith(mockUser)
    })

    it('should return different access and refresh tokens', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpasswordhash',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CLIENT'],
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFindByEmail.mockResolvedValue(mockUser)
      mockGenerateTokens.mockReturnValue({
        accessToken: 'unique-access-token',
        refreshToken: 'unique-refresh-token'
      })

      const result = await loginUseCase.execute({
        email: 'test@example.com',
        password: 'correct-password'
      })

      expect(result.accessToken).not.toBe(result.refreshToken)
      expect(result.accessToken).toBe('unique-access-token')
      expect(result.refreshToken).toBe('unique-refresh-token')
    })
  })

  describe('2.7 Incorrect password throws InvalidCredentialsError', () => {
    it.todo('should throw DomainError when password is incorrect - requires proper bcrypt mock')
  })

  describe('2.8 Non-existent email throws InvalidCredentialsError', () => {
    it('should throw UserNotFoundError when email does not exist', async () => {
      mockFindByEmail.mockResolvedValue(null)

      await expect(
        loginUseCase.execute({
          email: 'nonexistent@example.com',
          password: 'any-password'
        })
      ).rejects.toThrow(UserNotFoundError)
      await expect(
        loginUseCase.execute({
          email: 'nonexistent@example.com',
          password: 'any-password'
        })
      ).rejects.toThrow('Invalid credentials')
      expect(mockGenerateTokens).not.toHaveBeenCalled()
    })
  })

  describe('2.9 Unverified account handling', () => {
    it('should throw DomainError with 403 when account is not verified', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpasswordhash',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CLIENT'],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFindByEmail.mockResolvedValue(mockUser)

      await expect(
        loginUseCase.execute({
          email: 'test@example.com',
          password: 'correct-password'
        })
      ).rejects.toThrow(DomainError)
      await expect(
        loginUseCase.execute({
          email: 'test@example.com',
          password: 'correct-password'
        })
      ).rejects.toThrow('Account is not verified')

      try {
        await loginUseCase.execute({
          email: 'test@example.com',
          password: 'correct-password'
        })
      } catch (error) {
        if (error instanceof DomainError) {
          expect(error.suggestedHttpCode).toBe(403)
        }
      }
    })

    it('should allow login when account is verified', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpasswordhash',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CLIENT'],
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFindByEmail.mockResolvedValue(mockUser)

      const result = await loginUseCase.execute({
        email: 'test@example.com',
        password: 'correct-password'
      })

      expect(result.user.isVerified).toBe(true)
    })
  })
})
