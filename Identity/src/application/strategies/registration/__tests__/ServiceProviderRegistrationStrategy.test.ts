import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { ServiceProviderRegistrationStrategy } from '../ServiceProviderRegistrationStrategy'
import type { IAccountRepository } from '../../../ports/IAccountRepository'
import type { RegisterUserRequest } from '../../../dtos/RegisterUser.dto'
import type { User } from '../../../../domain/entities/User'
import { Role } from '../../../../domain/types/Role'

describe('ServiceProviderRegistrationStrategy', () => {
  let strategy: ServiceProviderRegistrationStrategy
  let mockAccountRepository: IAccountRepository

  beforeEach(() => {
    vi.clearAllMocks()

    mockAccountRepository = {
      createAccountAndAssignOwner: vi.fn().mockResolvedValue({
        id: 'account-123',
        name: "Provider's Account",
        type: 'INDIVIDUAL',
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    strategy = new ServiceProviderRegistrationStrategy(mockAccountRepository)
  })

  describe('4.2 ServiceProviderRegistrationStrategy creates user with role SERVICE_PROVIDER', () => {
    it('should create account and mark user as unverified for SERVICE_PROVIDER role', async () => {
      const mockMarkAsUnverified = vi.fn()

      const mockUser: User = {
        id: 'user-123',
        email: 'provider@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [Role.SERVICE_PROVIDER],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: Role) => role === Role.SERVICE_PROVIDER,
        markAsUnverified: mockMarkAsUnverified
      }

      const request: RegisterUserRequest = {
        email: 'provider@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: Role.SERVICE_PROVIDER
      }

      const result = await strategy.applySpecifics(mockUser, request)

      expect(mockAccountRepository.createAccountAndAssignOwner).toHaveBeenCalledWith(
        "Jane's Account",
        'INDIVIDUAL',
        'user-123'
      )
      expect(mockMarkAsUnverified).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(result.roles).toContain(Role.SERVICE_PROVIDER)
    })
  })
})
