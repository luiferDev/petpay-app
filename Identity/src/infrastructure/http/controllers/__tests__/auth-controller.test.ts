import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { Request, Response } from 'express'
import { AuthController } from '../auth-controller'
import { RegisterUserUseCase } from '../../../../application/use-case/auth/RegisterUserUseCase'
import { LoginUseCase } from '../../../../application/use-case/auth/LoginUseCase'
import { UserResponse } from '../../../../application/dtos/UserResponse.dto'
import { LoginResponse } from '../../../../application/dtos/LoginDTOs'
import { DomainError, UserNotFoundError } from '../../../../domain/errors/DomainError'

describe('AuthController', () => {
  let controller: AuthController
  let mockRegisterUseCase: ReturnType<typeof vi.fn>
  let mockLoginUseCase: ReturnType<typeof vi.fn>
  let mockResponse: Partial<Response>
  let mockCookies: Record<string, string>

  beforeEach(async () => {
    mockRegisterUseCase = vi.fn()
    mockLoginUseCase = vi.fn()
    mockCookies = {}

    controller = new AuthController(
      mockRegisterUseCase as unknown as RegisterUserUseCase,
      mockLoginUseCase as unknown as LoginUseCase
    )

    mockResponse = {
      cookie: vi.fn((name: string, value: string, options: any) => {
        mockCookies[name] = value
        return mockResponse as Response
      }),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
  })

  describe('POST /auth/register', () => {
    it('3.1 should return 201 on successful registration', async () => {
      const mockUserResponse: UserResponse = {
        id: 1,
        email: 'test@example.com',
        fullName: 'John Doe',
        roles: ['USER'],
        isVerified: false
      }

      mockRegisterUseCase.execute = vi.fn().mockResolvedValue(mockUserResponse)

      const mockRequest = {
        params: { role: 'user' },
        body: {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        }
      } as unknown as Request

      await controller.registerByRole(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 201,
        message: 'User registered successfully. Verification email sent.',
        data: mockUserResponse
      })
    })

    it('3.2 should return 400 on validation error', async () => {
      const validationError = new DomainError('Validation failed: email is required', 400, 'ValidationError')

      mockRegisterUseCase.execute = vi.fn().mockRejectedValue(validationError)

      const mockRequest = {
        params: { role: 'user' },
        body: {
          email: '',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        }
      } as unknown as Request

      await controller.registerByRole(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 400,
        message: 'Validation failed: email is required',
        error: 'ValidationError'
      })
    })
  })

  describe('POST /auth/login', () => {
    it('3.3 should return 200 on successful login', async () => {
      const mockLoginResponse: LoginResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          fullName: 'John Doe',
          roles: ['USER'],
          isVerified: true
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }

      mockLoginUseCase.execute = vi.fn().mockResolvedValue(mockLoginResponse)

      const mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      } as unknown as Request

      await controller.login(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 200,
        message: 'Login successful',
        data: {
          user: mockLoginResponse.user
        }
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
    })

    it('3.4 should return 401 on invalid credentials', async () => {
      mockLoginUseCase.execute = vi.fn().mockRejectedValue(new UserNotFoundError('Invalid credentials'))

      const mockRequest = {
        body: {
          email: 'wrong@example.com',
          password: 'wrongpassword'
        }
      } as unknown as Request

      await controller.login(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: 'Invalid credentials'
      })
    })
  })
})
