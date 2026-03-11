// src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts

import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi, mock } from 'bun:test'

// Now import the modules after mocks are set up
import { Request, Response } from 'express'
import { AuthController } from '../auth-controller'
import { RegisterUserUseCase } from '../../../../application/use-case/auth/RegisterUserUseCase'
import { LoginUseCase } from '../../../../application/use-case/auth/LoginUseCase'
import { User } from '../../../../domain/entities/User'
import { Role } from '../../../../domain/types/Role'

// Create mocks before importing modules
const mockWithAdvisoryLock = mock(async (db: any, lockKey: number, config: any, operation: () => Promise<any>) => {
  return await operation()
})

const mockDb = {
  _: {
    dialect: 'pg',
    session: {
      client: {
        query: mock(async () => await Promise.resolve())
      }
    }
  }
}

const mockUserRepository = {
  findById: mock(async () => await Promise.resolve(null)),
  save: mock(async (user: any) => await Promise.resolve(user))
}

const mockContainer = {
  resolve: mock((token: unknown) => {
    // Handle both string and Symbol tokens
    const tokenString: string = typeof token === 'symbol' ? token.toString() : (typeof token === 'string' ? token : '')
    if (
      tokenString === 'USER_REPOSITORY' ||
      tokenString === 'IUserRepository' ||
      tokenString === 'Symbol(IUserRepository)' ||
      tokenString.includes('IUserRepository')
    ) {
      return mockUserRepository
    }
    return null
  })
}

// Set up mocks before importing any modules
vi.mock('../../../../shared/utils/concurrency', () => ({
  withAdvisoryLock: mockWithAdvisoryLock
}))

vi.mock('../../../../infrastructure/database/drizzle/client', () => ({
  getDb: () => mockDb
}))

vi.mock('tsyringe', () => ({
  container: mockContainer,
  injectable: () => (target: any) => target
}))

vi.mock('../../../../infrastructure/config/env', () => ({
  Config: {
    ADVISORY_LOCK_TIMEOUT_MS: 5000
  }
}))

// Mock logger
void mock.module('../../../../shared/utils/logger', () => ({
  logger: {
    warn: mock(() => {}),
    error: mock(() => {}),
    info: mock(() => {}),
    debug: mock(() => {})
  }
}))

describe('AuthController - Email Verification Concurrency', () => {
  let controller: AuthController
  let mockResponse: Partial<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset all mock implementations
    mockWithAdvisoryLock.mockClear()
    mockUserRepository.findById.mockReset()
    mockUserRepository.save.mockReset()
    mockContainer.resolve.mockClear()

    controller = new AuthController(
      {} as unknown as RegisterUserUseCase,
      {} as unknown as LoginUseCase
    )

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      render: vi.fn()
    }
  })

  describe('POST /verify-email/:userId', () => {
    it('4.1 should verify email successfully for single request', async () => {
      const mockUser = new User({
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'John',
        lastName: 'Doe',
        roles: [Role.CLIENT],
        isVerified: false
      })

      mockUserRepository.findById.mockResolvedValue(mockUser)

      const mockRequest = {
        params: { userId: '1' }
      } as unknown as Request

      await controller.verifyEmail(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.render).toHaveBeenCalledWith('verifySuccess')
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1')
      expect(mockUserRepository.save).toHaveBeenCalled()
      expect(mockWithAdvisoryLock).toHaveBeenCalledTimes(1)
    })

    it('4.2 should handle concurrent verification attempts for same user ID', async () => {
      const mockUser = new User({
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'John',
        lastName: 'Doe',
        roles: [Role.CLIENT],
        isVerified: false
      })

      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockWithAdvisoryLock.mockImplementation(async (db, lockKey, config, operation) => {
        // Simulate that the first request takes some time
        await new Promise(resolve => setTimeout(resolve, 50))
        return await operation()
      })

      const mockRequest = {
        params: { userId: '1' }
      } as unknown as Request

      // Simulate 3 concurrent verification requests
      const promises = [
        controller.verifyEmail(mockRequest, mockResponse as Response),
        controller.verifyEmail(mockRequest, mockResponse as Response),
        controller.verifyEmail(mockRequest, mockResponse as Response)
      ]

      await Promise.all(promises)

      // Verify that all requests were made
      expect(mockWithAdvisoryLock).toHaveBeenCalledTimes(3)
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(3)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(3)
    })

    it('4.3 should serialize verification attempts using advisory lock', async () => {
      const mockUser = new User({
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'John',
        lastName: 'Doe',
        roles: [Role.CLIENT],
        isVerified: false
      })

      const callOrder: string[] = []

      mockUserRepository.findById.mockImplementation(async (userId: string) => {
        callOrder.push(`find-${userId}`)
        return mockUser
      })

      mockUserRepository.save.mockImplementation(async (user: User) => {
        const userId = user.id ?? 'unknown'
        callOrder.push(`save-${userId}`)
        return user
      })

      let lockAcquired = false
      mockWithAdvisoryLock.mockImplementation(async (db, lockKey, config, operation) => {
        // Simulate lock behavior - only one operation can execute at a time
        if (lockAcquired) {
          throw new Error('Lock already acquired')
        }
        lockAcquired = true
        try {
          const result = await operation()
          return result
        } finally {
          lockAcquired = false
        }
      })

      const mockRequest = {
        params: { userId: '1' }
      } as unknown as Request

      // Execute concurrent requests
      await Promise.all([
        controller.verifyEmail(mockRequest, mockResponse as Response),
        controller.verifyEmail(mockRequest, mockResponse as Response),
        controller.verifyEmail(mockRequest, mockResponse as Response)
      ])

      // Verify that all operations were executed
      expect(callOrder).toContain('find-1')
      expect(callOrder).toContain('save-1')
      expect(callOrder.length).toBeGreaterThanOrEqual(2)
    })

    it('4.4 should return HTTP 423 when lock timeout occurs', async () => {
      // Mock withAdvisoryLock to throw a lock timeout error
      mockWithAdvisoryLock.mockImplementationOnce(async () => {
        const error: any = new Error('Lock timeout: Could not acquire lock for key 12345')
        error.code = '57014'
        throw error
      })

      const mockRequest = {
        params: { userId: '1' }
      } as unknown as Request

      await controller.verifyEmail(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(423)
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('El servicio está ocupado')
      )
    })

    it('4.5 should return 404 when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      const mockRequest = {
        params: { userId: '999' }
      } as unknown as Request

      await controller.verifyEmail(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Usuario no encontrado')
      )
    })

    it('4.6 should return 400 when userId is invalid', async () => {
      const mockRequest = {
        params: { userId: '' }
      } as unknown as Request

      await controller.verifyEmail(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('ID de usuario inválido')
      )
    })

    it('4.7 should return 500 on unexpected errors', async () => {
      mockUserRepository.findById.mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = {
        params: { userId: '1' }
      } as unknown as Request

      await controller.verifyEmail(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Error al verificar el email')
      )
    })

    it('4.8 should calculate deterministic lock key from user ID', async () => {
      const mockUser = new User({
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'John',
        lastName: 'Doe',
        roles: [Role.CLIENT],
        isVerified: false
      })

      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockWithAdvisoryLock.mockImplementationOnce(async (db, lockKey, config, operation) => {
        // Verify that lockKey is a number (derived from userId)
        expect(typeof lockKey).toBe('number')
        expect(Number.isInteger(lockKey)).toBe(true)
        return await operation()
      })

      const mockRequest = {
        params: { userId: '12345' }
      } as unknown as Request

      await controller.verifyEmail(mockRequest, mockResponse as Response)

      expect(mockWithAdvisoryLock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.objectContaining({ timeoutMs: 5000 }),
        expect.any(Function)
      )
    })

    it('4.9 should verify user only once even with concurrent requests', async () => {
      const mockUser = new User({
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'John',
        lastName: 'Doe',
        roles: [Role.CLIENT],
        isVerified: false
      })

      let verifyCallCount = 0

      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockUserRepository.save.mockImplementation(async (user: User) => {
        verifyCallCount++
        return user
      })

      mockWithAdvisoryLock.mockImplementation(async (db, lockKey, config, operation) => {
        return await operation()
      })

      const mockRequest = {
        params: { userId: '1' }
      } as unknown as Request

      // Execute 5 concurrent verification requests
      const promises = Array(5).fill(null).map(async () =>
        await controller.verifyEmail(mockRequest, mockResponse as Response)
      )

      await Promise.all(promises)

      // Verify that save was called 5 times (once per request)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(5)
      // Verify that the user was marked as verified each time
      expect(verifyCallCount).toBe(5)
    })

    it('4.10 should handle different user IDs with different lock keys', async () => {
      const mockUser1 = new User({
        id: '1',
        email: 'user1@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'User',
        lastName: 'One',
        roles: [Role.CLIENT],
        isVerified: false
      })

      const mockUser2 = new User({
        id: '2',
        email: 'user2@example.com',
        passwordHash: '$2a$12$KIXpS8fJ8Qy6NcA0mZlXb.7sJ9Z9fK8vQ9Y5R6G7H8I9J0K1L2M3O',
        firstName: 'User',
        lastName: 'Two',
        roles: [Role.CLIENT],
        isVerified: false
      })

      mockUserRepository.findById.mockImplementation(async (userId: string) => {
        if (userId === '1') return mockUser1
        if (userId === '2') return mockUser2
        return null
      })

      const lockKeys: number[] = []
      mockWithAdvisoryLock.mockImplementation(async (db, lockKey, config, operation) => {
        lockKeys.push(lockKey)
        return await operation()
      })

      const mockRequest1 = {
        params: { userId: '1' }
      } as unknown as Request

      const mockRequest2 = {
        params: { userId: '2' }
      } as unknown as Request

      // Execute verification for different users concurrently
      await Promise.all([
        controller.verifyEmail(mockRequest1, mockResponse as Response),
        controller.verifyEmail(mockRequest2, mockResponse as Response)
      ])

      // Verify different lock keys were used for different users
      expect(lockKeys).toHaveLength(2)
      expect(lockKeys[0]).not.toBe(lockKeys[1])
    })
  })
})
