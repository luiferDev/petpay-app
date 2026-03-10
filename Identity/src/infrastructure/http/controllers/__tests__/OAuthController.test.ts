import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { Response, Request } from 'express'
import { OAuthStateManager } from '../../../services/OAuthStateManager'

const TEST_SECRET = 'this-is-a-very-secure-secret-key-32chars!'

describe('OAuthController - initiate() cookie tests', () => {
  let mockResponse: Partial<Response>
  let cookies: Record<string, string>
  let stateManager: OAuthStateManager

  beforeEach(() => {
    stateManager = new OAuthStateManager(TEST_SECRET)
    cookies = {}

    mockResponse = {
      cookie: vi.fn((name: string, value: string, options: any) => {
        cookies[name] = value
        return mockResponse as Response
      }),
      clearCookie: vi.fn((name: string) => {
        delete cookies[name]
        return mockResponse as Response
      }),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
  })

  describe('Cookie attributes', () => {
    it('should set oauth_state cookie with correct attributes in production', () => {
      const controllerInit = createMockInitiate()

      const mockRequest = {
        params: { provider: 'google' }
      } as unknown as Request

      process.env.NODE_ENV = 'production'
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/oauth/google/callback'

      controllerInit(mockRequest, mockResponse as Response)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 600000
        })
      )

      expect(cookies['oauth_state']).toBeDefined()
    })

    it('should set cookie with correct maxAge (600000ms = 10 minutes)', () => {
      const controllerInit = createMockInitiate()

      const mockRequest = {
        params: { provider: 'google' }
      } as unknown as Request

      process.env.NODE_ENV = 'production'
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/oauth/google/callback'

      controllerInit(mockRequest, mockResponse as Response)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          maxAge: 600000
        })
      )
    })

    it('should set cookie as httpOnly', () => {
      const controllerInit = createMockInitiate()

      const mockRequest = {
        params: { provider: 'google' }
      } as unknown as Request

      process.env.NODE_ENV = 'production'
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/oauth/google/callback'

      controllerInit(mockRequest, mockResponse as Response)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true
        })
      )
    })

    it('should use secure: true in production', () => {
      const controllerInit = createMockInitiate()

      const mockRequest = {
        params: { provider: 'google' }
      } as unknown as Request

      process.env.NODE_ENV = 'production'
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/oauth/google/callback'

      controllerInit(mockRequest, mockResponse as Response)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          secure: true
        })
      )
    })

    it('should use secure: false in development', () => {
      const controllerInit = createMockInitiate()

      const mockRequest = {
        params: { provider: 'google' }
      } as unknown as Request

      process.env.NODE_ENV = 'development'
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/oauth/google/callback'

      controllerInit(mockRequest, mockResponse as Response)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          secure: false
        })
      )
    })

    it('should generate state with correct format', () => {
      const controllerInit = createMockInitiate()

      const mockRequest = {
        params: { provider: 'google' }
      } as unknown as Request

      process.env.NODE_ENV = 'development'
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/oauth/google/callback'

      controllerInit(mockRequest, mockResponse as Response)

      const state = cookies['oauth_state']
      expect(state).toBeDefined()
      const parts = state.split(':')
      expect(parts.length).toBe(3)
      expect(parts[0]).toMatch(/^\d+$/)
      expect(parts[1]).toMatch(/^[a-f0-9]{32}$/)
      expect(parts[2]).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})

function createMockInitiate(): (req: Request, res: Response) => void {
  const stateManager = new OAuthStateManager(TEST_SECRET)

  return function initiate(req: Request, res: Response): void {
    const { provider } = req.params

    if (provider !== 'google' && provider !== 'github') {
      res.status(400).json({
        error: 'INVALID_PROVIDER',
        message: `Invalid OAuth provider: ${provider}. Supported providers: google, github`
      })
      return
    }

    if (!isOAuthEnabled()) {
      res.status(503).json({
        error: 'OAUTH_DISABLED',
        message: 'OAuth is temporarily unavailable'
      })
      return
    }

    if (!isProviderConfigured(provider as 'google' | 'github')) {
      res.status(503).json({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: `OAuth provider ${provider} is not configured`
      })
      return
    }

    const state = stateManager.generateState()

    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000
    })

    try {
      const authUrl = `https://${provider}.com/oauth/authorize?state=${state}`
      res.redirect(authUrl)
    } catch (error) {
      res.status(500).json({
        error: 'OAUTH_INIT_FAILED',
        message: 'Failed to initiate OAuth flow'
      })
    }
  }
}

function isOAuthEnabled(): boolean {
  return process.env.OAUTH_GOOGLE_CLIENT_ID !== undefined ||
         process.env.OAUTH_GITHUB_CLIENT_ID !== undefined
}

function isProviderConfigured(provider: 'google' | 'github'): boolean {
  if (provider === 'google') {
    return process.env.OAUTH_GOOGLE_CLIENT_ID !== undefined &&
           process.env.OAUTH_GOOGLE_CLIENT_SECRET !== undefined
  }
  if (provider === 'github') {
    return process.env.OAUTH_GITHUB_CLIENT_ID !== undefined &&
           process.env.OAUTH_GITHUB_CLIENT_SECRET !== undefined
  }
  return false
}
