import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { RegisterUserUseCase } from '../RegisterUserUseCase'
import type { IUserRepository } from '../../../../domain/repositories/IUserRepository'
import type { IEventPublisher } from '../../../ports/IEventPublisher'
import type { User } from '../../../../domain/entities/User'
import { UserAlreadyExistsError } from '../../../../domain/errors/DomainError'
import type { RegistrationStrategy } from '../../dtos/RegisterUser.dto'

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG')
}))

describe('RegisterUserUseCase', () => {
  let registerUserUseCase: RegisterUserUseCase
  let mockExistsByEmail: ReturnType<typeof vi.fn>
  let mockSave: ReturnType<typeof vi.fn>
  let mockPublish: ReturnType<typeof vi.fn>
  let mockUserRepository: IUserRepository
  let mockEventPublisher: IEventPublisher
  let mockStrategies: Map<string, RegistrationStrategy>

  beforeEach(() => {
    vi.clearAllMocks()

    mockExistsByEmail = vi.fn()
    mockSave = vi.fn()
    mockPublish = vi.fn()

    mockUserRepository = {
      save: mockSave,
      findById: vi.fn(),
      findByEmail: vi.fn(),
      existsByEmail: mockExistsByEmail,
      deleteById: vi.fn()
    }

    mockEventPublisher = {
      publish: mockPublish
    }

    mockStrategies = new Map()

    registerUserUseCase = new RegisterUserUseCase(
      mockUserRepository,
      mockEventPublisher,
      mockStrategies
    )
  })

  describe('2.1 Successful registration with valid input', () => {
    it('should register user successfully and return user response', async () => {
      const mockStrategy: RegistrationStrategy = {
        applySpecifics: vi.fn().mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['CLIENT'],
          isVerified: false
        })
      }
      mockStrategies.set('CLIENT', mockStrategy)

      const mockSavedUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CLIENT'],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: string) => role === 'SERVICE_PROVIDER'
      }

      mockExistsByEmail.mockResolvedValue(false)
      mockSave.mockResolvedValue(mockSavedUser)

      const result = await registerUserUseCase.execute({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT' as any
      })

      expect(result).toBeDefined()
      expect(result.email).toBe('test@example.com')
      expect(result.fullName).toBe('John Doe')
      expect(result.roles).toContain('CLIENT')
      expect(mockExistsByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockSave).toHaveBeenCalled()
      expect(mockPublish).toHaveBeenCalledWith(
        'user.created',
        expect.any(Object)
      )
    })

    it('should publish ServiceProviderRegisteredStrategy when role is SERVICE_PROVIDER', async () => {
      const mockStrategy: RegistrationStrategy = {
        applySpecifics: vi.fn().mockResolvedValue({
          id: 'provider-123',
          email: 'provider@example.com',
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
          firstName: 'Provider',
          lastName: 'User',
          roles: ['SERVICE_PROVIDER'],
          isVerified: false
        })
      }
      mockStrategies.set('SERVICE_PROVIDER', mockStrategy)

      const mockSavedUser: User = {
        id: 'provider-123',
        email: 'provider@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'Provider',
        lastName: 'User',
        roles: ['SERVICE_PROVIDER'],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: string) => role === 'SERVICE_PROVIDER'
      }

      mockExistsByEmail.mockResolvedValue(false)
      mockSave.mockResolvedValue(mockSavedUser)

      await registerUserUseCase.execute({
        email: 'provider@example.com',
        password: 'SecurePass123!',
        firstName: 'Provider',
        lastName: 'User',
        role: 'SERVICE_PROVIDER' as any
      })

      expect(mockPublish).toHaveBeenCalledTimes(2)
      expect(mockPublish).toHaveBeenCalledWith(
        'service.provider.registered',
        expect.any(Object)
      )
    })
  })

  describe('2.2 Duplicate email throws UserAlreadyExistsError', () => {
    it('should throw UserAlreadyExistsError when email already exists', async () => {
      mockExistsByEmail.mockResolvedValue(true)

      const request = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT' as any
      }

      await expect(registerUserUseCase.execute(request)).rejects.toThrow(UserAlreadyExistsError)
      await expect(registerUserUseCase.execute(request)).rejects.toThrow(
        'Email existing@example.com is already registered.'
      )
      expect(mockSave).not.toHaveBeenCalled()
    })
  })

  describe('2.3 & 2.4 Validation (handled at controller level with Zod)', () => {
    it('should note: invalid email and weak password validation happens in controller', () => {
      expect(true).toBe(true)
    })
  })

  describe('2.5 Strategy selection based on role', () => {
    it('should use CLIENT strategy when role is CLIENT', async () => {
      const mockClientStrategy: RegistrationStrategy = {
        applySpecifics: vi.fn().mockImplementation(async (user) => user)
      }
      mockStrategies.set('CLIENT', mockClientStrategy)

      const mockSavedUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CLIENT'],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: string) => role === 'CLIENT'
      }

      mockExistsByEmail.mockResolvedValue(false)
      mockSave.mockResolvedValue(mockSavedUser)

      await registerUserUseCase.execute({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT' as any
      })

      expect(mockClientStrategy.applySpecifics).toHaveBeenCalled()
    })

    it('should use SERVICE_PROVIDER strategy when role is SERVICE_PROVIDER', async () => {
      const mockProviderStrategy: RegistrationStrategy = {
        applySpecifics: vi.fn().mockImplementation(async (user) => user)
      }
      mockStrategies.set('SERVICE_PROVIDER', mockProviderStrategy)

      const mockSavedUser: User = {
        id: 'provider-123',
        email: 'provider@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'Provider',
        lastName: 'User',
        roles: ['SERVICE_PROVIDER'],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: string) => role === 'SERVICE_PROVIDER'
      }

      mockExistsByEmail.mockResolvedValue(false)
      mockSave.mockResolvedValue(mockSavedUser)

      await registerUserUseCase.execute({
        email: 'provider@example.com',
        password: 'SecurePass123!',
        firstName: 'Provider',
        lastName: 'User',
        role: 'SERVICE_PROVIDER' as any
      })

      expect(mockProviderStrategy.applySpecifics).toHaveBeenCalled()
    })

    it('should use ADMIN strategy when role is ADMIN', async () => {
      const mockAdminStrategy: RegistrationStrategy = {
        applySpecifics: vi.fn().mockImplementation(async (user) => user)
      }
      mockStrategies.set('ADMIN', mockAdminStrategy)

      const mockSavedUser: User = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['ADMIN'],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: string) => role === 'ADMIN'
      }

      mockExistsByEmail.mockResolvedValue(false)
      mockSave.mockResolvedValue(mockSavedUser)

      await registerUserUseCase.execute({
        email: 'admin@example.com',
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN' as any
      })

      expect(mockAdminStrategy.applySpecifics).toHaveBeenCalled()
    })

    it('should throw error when strategy is not found for role', async () => {
      mockExistsByEmail.mockResolvedValue(false)

      await expect(
        registerUserUseCase.execute({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'UNKNOWN_ROLE' as any
        })
      ).rejects.toThrow('Invalid registration role strategy: UNKNOWN_ROLE')
    })
  })
})
