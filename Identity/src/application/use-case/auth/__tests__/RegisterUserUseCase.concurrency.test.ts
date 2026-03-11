// src/application/use-case/auth/__tests__/RegisterUserUseCase.concurrency.test.ts

import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { RegisterUserUseCase } from '../RegisterUserUseCase'
import { IUserRepository } from '../../../ports/IUserRepository'
import { IEventPublisher } from '../../../ports/IEventPublisher'
import { UserAlreadyExistsError } from '../../../../domain/errors/DomainError'
import { User } from '../../../../domain/entities/User'
import { Role } from 'src/domain/types/Role'

// Mock dependencies
const mockUserRepository = {
  save: mock(),
  existsByEmail: mock()
}

const mockEventPublisher = {
  publish: mock(async () => await Promise.resolve()),
  subscribe: mock(),
  close: mock()
}

const mockRegistrationStrategies = new Map()

describe('RegisterUserUseCase concurrency', () => {
  let useCase: RegisterUserUseCase

  beforeEach(() => {
    mockUserRepository.save.mockClear()
    mockUserRepository.existsByEmail.mockClear()
    mockEventPublisher.publish.mockClear()

    // Setup a basic client strategy
    mockRegistrationStrategies.set('CLIENT', {
      applySpecifics: mock(async (user: User) => user)
    })

    useCase = new RegisterUserUseCase(
      mockUserRepository as unknown as IUserRepository,
      mockEventPublisher as unknown as IEventPublisher,
      mockRegistrationStrategies
    )
  })

  describe('concurrent registration scenarios', () => {
    it('should handle unique constraint violations as UserAlreadyExistsError', async () => {
      // Simulate a unique constraint violation
      const uniqueViolationError = new Error('duplicate key value violates unique constraint')
        ; (uniqueViolationError as any).code = '23505'

      mockUserRepository.save.mockRejectedValue(uniqueViolationError)

      const request = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CLIENT
      }

      await expect(useCase.execute(request)).rejects.toThrow(UserAlreadyExistsError)
      await expect(useCase.execute(request)).rejects.toThrow(/already registered/)
    })

    it('should pass through non-unique violation errors', async () => {
      const otherError = new Error('Database connection failed')
        ; (otherError as any).code = '08006'

      mockUserRepository.save.mockRejectedValue(otherError)

      const request = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CLIENT
      }

      await expect(useCase.execute(request)).rejects.toThrow('Database connection failed')
    })

    it('should successfully register user when no conflicts exist', async () => {
      // Create a valid bcrypt hash (60+ characters)
      // const longBcryptHash = '$2a$10$abcdefghijklmnopqrstuv$ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' // 68 chars

      // Mock the save to return a user with an ID
      mockUserRepository.save.mockImplementation(async (user: User) => {
        return new User({
          ...user,
          id: 'generated-id-123',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      })

      const request = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: Role.CLIENT
      }

      const result = await useCase.execute(request)

      expect(result.email).toBe('newuser@example.com')
      expect(result.id).toBe('generated-id-123')
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })
  })

  describe('SERIALIZABLE isolation behavior', () => {
    // Note: Retry logic is tested in DrizzleUserAdapter tests
    // This test verifies the use case properly handles repository errors
    it('should handle unique constraint violations as UserAlreadyExistsError', async () => {
      // Simulate a unique constraint violation (error code 23505)
      const uniqueViolationError = new Error('duplicate key value violates unique constraint')
        ; (uniqueViolationError as any).code = '23505'

      mockUserRepository.save.mockRejectedValue(uniqueViolationError)

      const request = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CLIENT
      }

      await expect(useCase.execute(request)).rejects.toThrow(UserAlreadyExistsError)
      await expect(useCase.execute(request)).rejects.toThrow(/already registered/)
    })
  })
})
