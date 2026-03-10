import { describe, it, expect } from 'bun:test'
import { User, type UserProps } from '../User'
import { Role } from '../../types/Role'

describe('User Entity', () => {
  const validPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhZr0aG'

  const createValidUserProps = (overrides?: Partial<UserProps>): UserProps => ({
    email: 'test@example.com',
    passwordHash: validPasswordHash,
    firstName: 'John',
    lastName: 'Doe',
    roles: [Role.CLIENT],
    isVerified: false,
    ...overrides
  })

  describe('7.1 Creates user with valid props', () => {
    it('should create a user with all valid properties', () => {
      const props = createValidUserProps()

      const user = new User(props)

      expect(user.email).toBe('test@example.com')
      expect(user.passwordHash).toBe(validPasswordHash)
      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.roles).toEqual([Role.CLIENT])
      expect(user.isVerified).toBe(false)
    })

    it('should create user with all roles', () => {
      const props = createValidUserProps({
        roles: [Role.CLIENT, Role.SERVICE_PROVIDER, Role.ADMIN]
      })

      const user = new User(props)

      expect(user.roles).toHaveLength(3)
      expect(user.roles).toContain(Role.CLIENT)
      expect(user.roles).toContain(Role.SERVICE_PROVIDER)
      expect(user.roles).toContain(Role.ADMIN)
    })

    it('should lowercase email on creation', () => {
      const props = createValidUserProps({ email: 'TEST@EXAMPLE.COM' })

      const user = new User(props)

      expect(user.email).toBe('test@example.com')
    })
  })

  describe('7.2 Validates email format', () => {
    it('should throw error when email is empty', () => {
      const props = createValidUserProps({ email: '' })

      expect(() => new User(props)).toThrow(
        'User must have a valid email address (Invariant failed)'
      )
    })

    it('should throw error when email has no @ symbol', () => {
      const props = createValidUserProps({ email: 'testexample.com' })

      expect(() => new User(props)).toThrow(
        'User must have a valid email address (Invariant failed)'
      )
    })

    it('should throw error when email is undefined', () => {
      const props = createValidUserProps({ email: undefined as any })

      expect(() => new User(props)).toThrow()
    })
  })

  describe('7.3 hasRole returns correct value', () => {
    it('should return true when user has the role', () => {
      const props = createValidUserProps({ roles: [Role.CLIENT, Role.ADMIN] })

      const user = new User(props)

      expect(user.hasRole(Role.CLIENT)).toBe(true)
      expect(user.hasRole(Role.ADMIN)).toBe(true)
    })

    it('should return false when user does not have the role', () => {
      const props = createValidUserProps({ roles: [Role.CLIENT] })

      const user = new User(props)

      expect(user.hasRole(Role.ADMIN)).toBe(false)
      expect(user.hasRole(Role.SERVICE_PROVIDER)).toBe(false)
    })

    it('should return false for empty roles array', () => {
      const props = createValidUserProps({ roles: [] })

      expect(() => new User(props)).toThrow(
        'User must have at least one role (Invariant failed)'
      )
    })
  })

  describe('Password hash validation', () => {
    it('should throw error when password hash is too short', () => {
      const props = createValidUserProps({ passwordHash: 'short' })

      expect(() => new User(props)).toThrow(
        'Password hash is too short (Invariant failed: Must be hashed)'
      )
    })
  })
})
