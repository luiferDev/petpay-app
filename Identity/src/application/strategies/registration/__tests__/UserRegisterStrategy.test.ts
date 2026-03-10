import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { ClientRegistrationStrategy } from '../UserRegisterStrategy'
import type { IAccountRepository } from '../../../ports/IAccountRepository'
import type { RegisterUserRequest } from '../../../dtos/RegisterUser.dto'
import type { User } from '../../../../domain/entities/User'
import { Role } from '../../../../domain/types/Role'

describe('ClientRegistrationStrategy', () => {
  let strategy: ClientRegistrationStrategy
  let mockAccountRepository: IAccountRepository

  beforeEach(() => {
    vi.clearAllMocks()

    mockAccountRepository = {
      createAccountAndAssignOwner: vi.fn().mockResolvedValue({
        id: 'account-123',
        name: "John's Account",
        type: 'INDIVIDUAL',
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    strategy = new ClientRegistrationStrategy(mockAccountRepository)
  })

  describe('4.1 ClientRegistrationStrategy creates user with role CLIENT', () => {
    it('should create account and return user with CLIENT role', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'client@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG',
        firstName: 'John',
        lastName: 'Doe',
        roles: [Role.CLIENT],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasRole: (role: Role) => role === Role.CLIENT
      }

      const request: RegisterUserRequest = {
        email: 'client@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.CLIENT
      }

      const result = await strategy.applySpecifics(mockUser, request)

      expect(mockAccountRepository.createAccountAndAssignOwner).toHaveBeenCalledWith(
        "John's Account",
        'INDIVIDUAL',
        'user-123'
      )
      expect(result).toBeDefined()
      expect(result.roles).toContain(Role.CLIENT)
    })
  })
})
