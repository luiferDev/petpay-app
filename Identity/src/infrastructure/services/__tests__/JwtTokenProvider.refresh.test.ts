import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'bun:test'
import * as jwt from 'jsonwebtoken'
import { JwtTokenProvider } from '../JwtTokenProvider'
import { Config } from '../../../../infrastructure/config/env'

// Mock config
vi.mock('../../../../infrastructure/config/env', () => ({
  Config: {
    JWT_SECRET: 'test-secret-key-min-32-chars-long!!',
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d'
  }
}))

describe('JwtTokenProvider', () => {
  let jwtTokenProvider: JwtTokenProvider

  beforeEach(() => {
    vi.clearAllMocks()
    jwtTokenProvider = new JwtTokenProvider()
  })

  describe('generateTokensWithTokenId', () => {
    it('should generate access token without tokenId', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['CLIENT']
      } as any

      const { accessToken } = jwtTokenProvider.generateTokensWithTokenId(mockUser)

      const decoded = jwt.verify(accessToken, Config.JWT_SECRET) as any
      expect(decoded.id).toBe('user-123')
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.tokenId).toBeUndefined()
    })

    it('should generate refresh token with tokenId (jti)', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['CLIENT']
      } as any

      const { refreshToken, tokenId } = jwtTokenProvider.generateTokensWithTokenId(mockUser)

      expect(tokenId).toBeDefined()
      expect(tokenId).toMatch(/^[0-9a-f-]{36}$/) // UUID format

      const decoded = jwt.verify(refreshToken, Config.JWT_SECRET) as any
      expect(decoded.tokenId).toBe(tokenId)
      expect(decoded.id).toBe('user-123')
      expect(decoded.email).toBe('test@example.com')
    })

    it('should generate unique tokenId for each call', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['CLIENT']
      } as any

      const { tokenId: tokenId1 } = jwtTokenProvider.generateTokensWithTokenId(mockUser)
      const { tokenId: tokenId2 } = jwtTokenProvider.generateTokensWithTokenId(mockUser)

      expect(tokenId1).not.toBe(tokenId2)
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify and decode refresh token with tokenId', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['CLIENT']
      } as any

      const { refreshToken, tokenId } = jwtTokenProvider.generateTokensWithTokenId(mockUser)

      const decoded = jwtTokenProvider.verifyRefreshToken(refreshToken)

      expect(decoded.tokenId).toBe(tokenId)
      expect(decoded.id).toBe('user-123')
      expect(decoded.email).toBe('test@example.com')
    })

    it('should throw on invalid token', () => {
      expect(() => {
        jwtTokenProvider.verifyRefreshToken('invalid-token')
      }).toThrow()
    })

    it('should throw on expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', tokenId: 'test-uuid' },
        Config.JWT_SECRET,
        { expiresIn: '-1s' }
      )

      expect(() => {
        jwtTokenProvider.verifyRefreshToken(expiredToken)
      }).toThrow()
    })
  })

  describe('generateTokensForOAuthUser with tokenId', () => {
    it('should generate tokens with tokenId for OAuth users', () => {
      const { accessToken, refreshToken, tokenId } = jwtTokenProvider.generateTokensWithTokenIdForOAuthUser(
        'user-123',
        'test@example.com',
        'CLIENT' as any
      )

      expect(tokenId).toBeDefined()
      expect(tokenId).toMatch(/^[0-9a-f-]{36}$/)

      const accessDecoded = jwt.verify(accessToken, Config.JWT_SECRET) as any
      expect(accessDecoded.tokenId).toBeUndefined()

      const refreshDecoded = jwt.verify(refreshToken, Config.JWT_SECRET) as any
      expect(refreshDecoded.tokenId).toBe(tokenId)
    })
  })
})
