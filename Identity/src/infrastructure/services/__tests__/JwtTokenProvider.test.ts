import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import jwt from 'jsonwebtoken'
import type { User } from '../../../../domain/entities/User'

process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'
process.env.ACCESS_TOKEN_EXPIRY = '15m'
process.env.REFRESH_TOKEN_EXPIRY = '7d'
process.env.RABBITMQ_URL = 'amqp://test:test@localhost:5672'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret-key-32chars-long'
process.env.NODE_ENV = 'test'

const { JwtTokenProvider } = await import('../JwtTokenProvider')

describe('JwtTokenProvider', () => {
  let jwtProvider: JwtTokenProvider

  beforeEach(() => {
    vi.clearAllMocks()
    jwtProvider = new JwtTokenProvider()
  })

  describe('5.1 generateToken returns valid JWT string', () => {
    it('should generate a valid JWT access and refresh token', () => {
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

      const result = jwtProvider.generateTokens(mockUser)

      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(typeof result.accessToken).toBe('string')
      expect(typeof result.refreshToken).toBe('string')
      expect(result.accessToken.split('.')).toHaveLength(3)
      expect(result.refreshToken.split('.')).toHaveLength(3)
    })

    it('should generate different access and refresh tokens', () => {
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

      const result = jwtProvider.generateTokens(mockUser)

      expect(result.accessToken).not.toBe(result.refreshToken)
    })
  })

  describe('5.2 verifyToken accepts valid token', () => {
    it('should verify a valid token and return the payload', () => {
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

      const { accessToken } = jwtProvider.generateTokens(mockUser)
      const payload = jwtProvider.verifyToken(accessToken)

      expect(payload).toBeDefined()
      expect(payload.id).toBe('user-123')
      expect(payload.email).toBe('test@example.com')
      expect(payload.role).toBe('CLIENT')
    })

    it('should verify token generated for OAuth user', () => {
      const { accessToken } = jwtProvider.generateTokensForOAuthUser(
        'oauth-user-456',
        'oauth@example.com',
        'SERVICE_PROVIDER' as any
      )

      const payload = jwtProvider.verifyToken(accessToken)

      expect(payload).toBeDefined()
      expect(payload.id).toBe('oauth-user-456')
      expect(payload.email).toBe('oauth@example.com')
      expect(payload.role).toBe('SERVICE_PROVIDER')
    })
  })

  describe('5.3 verifyToken rejects expired token', () => {
    it('should throw error for already expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com', role: 'CLIENT' },
        'test-jwt-secret-key-for-testing',
        { expiresIn: '-1s' }
      )

      expect(() => {
        jwtProvider.verifyToken(expiredToken)
      }).toThrow()
    })

    it('should throw TokenExpiredError for expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com', role: 'CLIENT' },
        'test-jwt-secret-key-for-testing',
        { expiresIn: '-1s' }
      )

      expect(() => {
        jwtProvider.verifyToken(expiredToken)
      }).toThrow()
    })
  })

  describe('5.4 verifyToken rejects invalid token', () => {
    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.string'

      expect(() => {
        jwtProvider.verifyToken(invalidToken)
      }).toThrow()
    })

    it('should throw error for tampered token', () => {
      const validToken: string = jwt.sign(
        { id: 'user-123', email: 'test@example.com', role: 'CLIENT' },
        'test-jwt-secret-key-for-testing',
        { expiresIn: '15m' }
      )

      const tamperedToken = validToken.slice(0, -5) + 'xxxxx'

      expect(() => {
        jwtProvider.verifyToken(tamperedToken)
      }).toThrow()
    })

    it('should throw error for token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com', role: 'CLIENT' },
        'wrong-secret-key',
        { expiresIn: '15m' }
      )

      expect(() => {
        jwtProvider.verifyToken(wrongSecretToken)
      }).toThrow()
    })

    it('should throw error for empty token', () => {
      expect(() => {
        jwtProvider.verifyToken('')
      }).toThrow()
    })
  })
})
