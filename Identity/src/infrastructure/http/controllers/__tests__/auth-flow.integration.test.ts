import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuthController } from '../auth-controller'
import { RegisterUserUseCase } from '../../../application/use-case/auth/RegisterUserUseCase'
import { LoginUseCase } from '../../../application/use-case/auth/LoginUseCase'
import { UserResponse } from '../../../application/dtos/UserResponse.dto'
import { LoginResponse } from '../../../application/dtos/LoginDTOs'
import { protect } from '../../middlewares/auth.middleware'

describe('Auth Flow Integration Tests', () => {
  let controller: AuthController
  let mockRegisterUseCase: ReturnType<typeof vi.fn>
  let mockLoginUseCase: ReturnType<typeof vi.fn>
  let mockResponse: Partial<Response>
  let mockCookies: Record<string, string>

  const JWT_SECRET = process.env.JWT_SECRET_KEY ?? 'secret'
  const testUser = {
    email: 'integration@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER'
  }

  beforeEach(async () => {
    mockRegisterUseCase = vi.fn()
    mockLoginUseCase = vi.fn()
    mockCookies = {}

    controller = new AuthController(
      mockRegisterUseCase as unknown as RegisterUserUseCase,
      mockLoginUseCase as unknown as LoginUseCase
    )

    mockResponse = {
      cookie: vi.fn((name: string, value: string, _options: Record<string, unknown>) => {
        mockCookies[name] = value
        return mockResponse as Response
      }),
      clearCookie: vi.fn((_name: string) => {
        return mockResponse as Response
      }),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
  })

  describe('8.1 Complete Auth Flow: Register → Login → Access Protected Route', () => {
    it('should complete full auth flow: register user, login, and access protected route', async () => {
      const registeredUser: UserResponse = {
        id: 1,
        email: testUser.email,
        fullName: `${testUser.firstName} ${testUser.lastName}`,
        roles: ['USER'],
        isVerified: false
      }

      const loginResponse: LoginResponse = {
        user: {
          id: 1,
          email: testUser.email,
          fullName: `${testUser.firstName} ${testUser.lastName}`,
          roles: ['USER'],
          isVerified: false
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }

      mockRegisterUseCase.execute = vi.fn().mockResolvedValue(registeredUser)
      mockLoginUseCase.execute = vi.fn().mockResolvedValue(loginResponse)

      const registerRequest = {
        params: { role: 'user' },
        body: {
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }
      } as unknown as Request

      await controller.registerByRole(registerRequest, mockResponse as Response)

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: 'USER'
      })

      const loginRequest = {
        body: {
          email: testUser.email,
          password: testUser.password
        }
      } as unknown as Request

      await controller.login(loginRequest, mockResponse as Response)

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password
      })

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-access-token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 3600000
        })
      )

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 8640000000
        })
      )

      const protectedResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response
      const protectedNext = vi.fn()

      const tokenPayload = { id: '1', email: testUser.email, role: 'USER' }
      const validToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' })

      const protectedRequest = {
        cookies: { access_token: validToken }
      } as unknown as Request

      protect(protectedRequest, protectedResponse, protectedNext)

      expect(protectedNext).toHaveBeenCalled()
      expect(protectedRequest.user).toEqual({
        id: '1',
        email: testUser.email,
        role: 'USER'
      })
      expect(protectedResponse.status).not.toHaveBeenCalledWith(401)
    })

    it('should fail to access protected route without token', () => {
      const protectedResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response
      const protectedNext = vi.fn()

      const protectedRequest = {
        cookies: {}
      } as unknown as Request

      protect(protectedRequest, protectedResponse, protectedNext)

      expect(protectedResponse.status).toHaveBeenCalledWith(401)
      expect(protectedResponse.json).toHaveBeenCalledWith({
        message: 'Acceso no autorizado. Token no proporcionado.'
      })
      expect(protectedNext).not.toHaveBeenCalled()
    })

    it('should fail to access protected route with invalid token', () => {
      const protectedResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response
      const protectedNext = vi.fn()

      const protectedRequest = {
        cookies: { access_token: 'invalid-token' }
      } as unknown as Request

      protect(protectedRequest, protectedResponse, protectedNext)

      expect(protectedResponse.status).toHaveBeenCalledWith(401)
      expect(protectedResponse.json).toHaveBeenCalledWith({
        message: 'Token inválido o expirado.'
      })
      expect(protectedNext).not.toHaveBeenCalled()
    })

    it('should register user and then login successfully', async () => {
      const registeredUser: UserResponse = {
        id: 1,
        email: testUser.email,
        fullName: `${testUser.firstName} ${testUser.lastName}`,
        roles: ['USER'],
        isVerified: false
      }

      const loginResponse: LoginResponse = {
        user: {
          id: 1,
          email: testUser.email,
          fullName: `${testUser.firstName} ${testUser.lastName}`,
          roles: ['USER'],
          isVerified: false
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }

      mockRegisterUseCase.execute = vi.fn().mockResolvedValue(registeredUser)
      mockLoginUseCase.execute = vi.fn().mockResolvedValue(loginResponse)

      const registerRequest = {
        params: { role: 'user' },
        body: {
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }
      } as unknown as Request

      await controller.registerByRole(registerRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 201,
        message: 'User registered successfully. Verification email sent.',
        data: registeredUser
      })

      const loginRequest = {
        body: {
          email: testUser.email,
          password: testUser.password
        }
      } as unknown as Request

      await controller.login(loginRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 200,
        message: 'Login successful',
        data: {
          user: loginResponse.user
        }
      })
    })

    it('should refresh token and maintain access', () => {
      const tokenPayload = { id: '1', email: testUser.email, role: 'USER' }
      const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' })
      const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' })

      mockCookies.refresh_token = refreshToken

      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string, email: string, role: string }
      void decoded

      const protectedResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response
      const protectedNext = vi.fn()

      const protectedRequest = {
        cookies: { access_token: newAccessToken }
      } as unknown as Request

      protect(protectedRequest, protectedResponse, protectedNext)

      expect(protectedNext).toHaveBeenCalled()
      expect(protectedRequest.user).toEqual({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      })
    })

    it('should reject expired refresh token', () => {
      const tokenPayload = { id: '1', email: testUser.email, role: 'USER' }
      const expiredRefreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '-1s' })

      const protectedResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response
      const protectedNext = vi.fn()

      const protectedRequest = {
        cookies: { access_token: expiredRefreshToken }
      } as unknown as Request

      protect(protectedRequest, protectedResponse, protectedNext)

      expect(protectedResponse.status).toHaveBeenCalledWith(401)
      expect(protectedResponse.json).toHaveBeenCalledWith({
        message: 'Token inválido o expirado.'
      })
      expect(protectedNext).not.toHaveBeenCalled()
    })
  })
})
