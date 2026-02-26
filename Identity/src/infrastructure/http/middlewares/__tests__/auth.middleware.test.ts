import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { protect } from '../auth.middleware'

describe('Auth Middleware (protect)', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockRequest = {
      cookies: {}
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    mockNext = vi.fn()
  })

  describe('6.1 Valid token allows request through', () => {
    it('should call next() and attach user to request with valid token', () => {
      const payload = { id: '1', email: 'test@example.com', role: 'USER' }
      const token = jwt.sign(payload, process.env.JWT_SECRET_KEY ?? 'secret', { expiresIn: '1h' })
      mockRequest.cookies = { access_token: token }

      protect(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRequest.user).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'USER'
      })
      expect(mockResponse.status).not.toHaveBeenCalledWith(401)
    })
  })

  describe('6.2 Missing token returns 401', () => {
    it('should return 401 when no token is provided', () => {
      mockRequest.cookies = {}

      protect(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Acceso no autorizado. Token no proporcionado.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when access_token cookie is undefined', () => {
      mockRequest.cookies = { access_token: undefined }

      protect(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
    })
  })

  describe('6.3 Invalid token returns 401', () => {
    it('should return 401 with invalid token', () => {
      mockRequest.cookies = { access_token: 'invalid-token-xyz' }

      protect(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token inválido o expirado.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 with expired token', () => {
      const payload = { id: '1', email: 'test@example.com', role: 'USER' }
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET_KEY ?? 'secret', { expiresIn: '-1s' })
      mockRequest.cookies = { access_token: expiredToken }

      protect(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token inválido o expirado.'
      })
    })
  })
})
