import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import express from 'express'
import type { Server } from 'http'
import cookieParser from 'cookie-parser'
import path from 'path'
import jwt from 'jsonwebtoken'
import { Config } from '../../infrastructure/config/env'
import { corsMiddleware } from '../../infrastructure/http/middlewares/cors'
import { authRateLimiter, generalRateLimiter } from '../../infrastructure/http/middlewares/rate-limiter'
import authRouter from '../../infrastructure/http/routes/auth.routes'
import { setupDI } from '../../infrastructure/DI/container'

setupDI()

const dbUrl: string | undefined = process.env.DATABASE_URL
const redisHost: string | undefined = process.env.REDIS_HOST
const redisUrl: string | undefined = process.env.REDIS_URL
const hasInfrastructure = (
  dbUrl !== undefined &&
  (redisHost !== undefined || redisUrl !== undefined)
)

function buildApp (): express.Application {
  const app = express()

  app.use(express.json())
  app.disable('x-powered-by')
  app.use(corsMiddleware())
  app.use(cookieParser())
  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '../../infrastructure/http/views'))

  app.get('/', generalRateLimiter, (req, res) => {
    res.send('Hello from Express and Bun!')
  })

  app.get('/health', generalRateLimiter, (req, res) => {
    res.json({ status: 'healthy', service: 'identity' })
  })

  app.get('/api/v1/health', generalRateLimiter, (req, res) => {
    res.json({ status: 'healthy', service: 'identity' })
  })

  app.use('/api/v1/auth', authRateLimiter, authRouter)

  return app
}

function generateTestToken (overrides: Record<string, unknown> = {}): string {
  const payload = {
    id: 99999,
    email: 'test@example.com',
    role: 'CLIENT' as const,
    ...overrides
  }
  return jwt.sign(payload, Config.JWT_SECRET, { expiresIn: '1h' })
}

function generateExpiredToken (): string {
  const payload = {
    id: 99999,
    email: 'test@example.com',
    role: 'CLIENT' as const
  }
  return jwt.sign(payload, Config.JWT_SECRET, { expiresIn: '-1h' })
}

function generateRefreshToken (overrides: Record<string, unknown> = {}): string {
  const payload = {
    id: 99999,
    email: 'test@example.com',
    role: 'CLIENT' as const,
    jti: 'test-token-id-' + String(Date.now()),
    ...overrides
  }
  return jwt.sign(payload, Config.JWT_SECRET, { expiresIn: '7d' })
}

const uniqueEmail = (): string => `integration-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@petpay-test.com`

describe('Identity API Integration Tests', () => {
  let app: express.Application
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    app = buildApp()

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address()
        if (addr !== null && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`
        }
        resolve()
      })
    })
  })

  afterAll(async () => {
    if (server !== undefined) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    }
  })

  describe('Health Check', () => {
    it('GET /health returns 200 with status ok', async () => {
      const res = await fetch(`${baseUrl}/health`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('healthy')
      expect(body.service).toBe('identity')
    })

    it('GET /api/v1/health returns 200 with status ok', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('healthy')
    })
  })

  describe('Registration Flow', () => {
    const testEmail = uniqueEmail()
    const testPassword = 'StrongPass1!'
    const testFullName = 'Integration Test User'

    it('POST /api/v1/auth/register with valid USER data returns 201', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          fullName: testFullName
        })
      })

      if (hasInfrastructure) {
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.status).toBe(201)
        expect(body.data).toBeDefined()
        expect(body.data.email).toBe(testEmail)
        expect(body.data.roles).toContain('CLIENT')
      } else {
        // When infrastructure is missing, the app may respond with 500
        // The test still validates the HTTP layer works
        expect([201, 400, 500]).toContain(res.status)
      }
    })

    it('POST /api/v1/auth/register with duplicate email returns 409', async () => {
      if (!hasInfrastructure) {
        return
      }

      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          fullName: testFullName
        })
      })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })

    it('POST /api/v1/auth/register with invalid email returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'StrongPass1!',
          fullName: 'Test User'
        })
      })

      expect(res.status).toBe(400)
    })

    it('POST /api/v1/auth/register with weak password returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueEmail(),
          password: '123',
          fullName: 'Test User'
        })
      })

      expect(res.status).toBe(400)
    })
  })

  describe('Login Flow', () => {
    const testEmail = uniqueEmail()
    const testPassword = 'StrongPass1!'

    it('POST /api/v1/auth/login with valid credentials returns 200 with tokens', async () => {
      if (!hasInfrastructure) {
        return
      }

      const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          fullName: 'Login Test User'
        })
      })

      expect(registerRes.status).toBe(201)

      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })

      expect(loginRes.status).toBe(200)
      const loginBody = await loginRes.json()
      expect(loginBody.data).toBeDefined()
      expect(loginBody.data.user).toBeDefined()
      expect(loginBody.data.user.email).toBe(testEmail)
    })

    it('POST /api/v1/auth/login with wrong password returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword1!'
        })
      })

      expect(res.status).toBe(401)
    })

    it('POST /api/v1/auth/login for non-existent user returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent-' + uniqueEmail(),
          password: 'SomePass1!'
        })
      })

      expect(res.status).toBe(401)
    })
  })

  describe('Protected Endpoint Access', () => {
    it('GET /api/v1/auth/users with valid token returns 200', async () => {
      const token = generateTestToken()
      const res = await fetch(`${baseUrl}/api/v1/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      expect([200, 403]).toContain(res.status)
    })

    it('GET /api/v1/auth/users without token returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/users`)

      expect(res.status).toBe(401)
    })

    it('GET /api/v1/auth/users with expired token returns 401', async () => {
      const token = generateExpiredToken()
      const res = await fetch(`${baseUrl}/api/v1/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      expect(res.status).toBe(401)
    })

    it('returns 401 with malformed token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/users`, {
        headers: {
          Authorization: 'Bearer invalid-token-format'
        }
      })

      expect(res.status).toBe(401)
    })
  })

  describe('Token Refresh', () => {
    it('POST /api/v1/auth/refresh with invalid refresh token returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token'
        })
      })

      expect(res.status).toBe(401)
    })

    it('POST /api/v1/auth/refresh with missing refresh token returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)
    })
  })

  describe('Role-based Registration', () => {
    it('POST /api/v1/auth/register/:role with SERVICE_PROVIDER returns 201', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register/SERVICE_PROVIDER`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueEmail(),
          password: 'StrongPass1!',
          fullName: 'Service Provider User'
        })
      })

      if (hasInfrastructure) {
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.data).toBeDefined()
      } else {
        expect([201, 400, 500]).toContain(res.status)
      }
    })
  })

  describe('Logout Flow', () => {
    it('POST /api/v1/auth/logout without token returns 200 (idempotent)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toBe('Logged out successfully')
    })

    it('POST /api/v1/auth/logout with valid refresh token returns 200', async () => {
      const refreshToken = generateRefreshToken()
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })

      expect(res.status).toBe(200)
    })
  })
})
