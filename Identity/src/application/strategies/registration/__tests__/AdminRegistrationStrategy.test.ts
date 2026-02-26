import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { AdminRegistrationStrategy } from '../AdminRegistrationStrategy'
import type { IAccountRepository } from '../../../ports/IAccountRepository'
import type { RegisterUserRequest } from '../../../dtos/RegisterUser.dto'
import type { User } from '../../../../domain/entities/User'
import { Role } from '../../../../domain/types/Role'

describe('AdminRegistrationStrategy', () => {
  let strategy: AdminRegistrationStrategy
  let mockAccountRepository: IAccountRepository

  beforeEach(() => {
    vi.clearAllMocks()

    mockAccountRepository = {
      createAccountAndAssignOwner: vi.fn().mockResolvedValue({
        id: 'account-123',
        name: "Admin's Account",
        type: 'INDIVIDUAL',
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    strategy = new AdminRegistrationStrategy(mockAccountRepository)
  })

  describe('4.3 AdminRegistrationStrategy creates user with role ADMIN', () => {
    it('should create account for user with ADMIN role', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'admin@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'Admin',
        lastName: 'User',
        roles: [Role.ADMIN],
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: Role) => role === Role.ADMIN
      }

      const request: RegisterUserRequest = {
        email: 'admin@example.com',
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN
      }

      const result = await strategy.applySpecifics(mockUser, request)

      expect(mockAccountRepository.createAccountAndAssignOwner).toHaveBeenCalledWith(
        "Admin's Account",
        'INDIVIDUAL',
        'user-123'
      )
      expect(result).toBeDefined()
      expect(result.roles).toContain(Role.ADMIN)
    })
  })
})
