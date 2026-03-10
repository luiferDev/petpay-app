import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { Request, Response, NextFunction } from 'express'
import { errorHandler } from '../error.handler'
import { DomainError, UserNotFoundError, UserAlreadyExistsError } from '../../../../domain/errors/DomainError'

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockRequest = {
      path: '/test'
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    mockNext = vi.fn()
  })

  describe('6.6 Returns formatted error response', () => {
    it('should return 500 with formatted response for generic error', () => {
      const genericError = new Error('Something went wrong')

      errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 500,
        error: 'InternalServerError',
        message: 'An unexpected error occurred'
      })
    })

    it('should return 500 for error without message', () => {
      const errorWithoutMessage = new Error()

      errorHandler(errorWithoutMessage, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          error: 'InternalServerError'
        })
      )
    })

    it('should include status in response for generic errors', () => {
      const genericError = new Error('Database connection failed')

      errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500
        })
      )
    })
  })

  describe('6.7 Handles DomainError with suggestedHttpCode', () => {
    it('should return 404 for UserNotFoundError', () => {
      const notFoundError = new UserNotFoundError('User with id 123 not found')

      errorHandler(notFoundError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 404,
        error: 'UserNotFoundError',
        message: 'User with id 123 not found'
      })
    })

    it('should return 409 for UserAlreadyExistsError', () => {
      const conflictError = new UserAlreadyExistsError('Email test@example.com already exists')

      errorHandler(conflictError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(409)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 409,
        error: 'UserAlreadyExistsError',
        message: 'Email test@example.com already exists'
      })
    })

    it('should use custom suggestedHttpCode from DomainError', () => {
      const customError = new DomainError('Rate limit exceeded', 429, 'RateLimitError')

      errorHandler(customError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'RateLimitError',
          message: 'Rate limit exceeded'
        })
      )
    })

    it('should return 400 for DomainError with suggestedHttpCode 400', () => {
      const badRequestError = new DomainError('Invalid input', 400, 'ValidationDomainError')

      errorHandler(badRequestError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 400,
        error: 'ValidationDomainError',
        message: 'Invalid input'
      })
    })

    it('should return 401 for DomainError with suggestedHttpCode 401', () => {
      const unauthorizedError = new DomainError('Unauthorized access', 401, 'UnauthorizedError')

      errorHandler(unauthorizedError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        error: 'UnauthorizedError',
        message: 'Unauthorized access'
      })
    })

    it('should return 403 for DomainError with suggestedHttpCode 403', () => {
      const forbiddenError = new DomainError('Access forbidden', 403, 'ForbiddenError')

      errorHandler(forbiddenError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 403,
        error: 'ForbiddenError',
        message: 'Access forbidden'
      })
    })

    it('should handle DomainError with default 500 code', () => {
      const defaultError = new DomainError('Some domain error')

      errorHandler(defaultError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 500,
        error: 'DomainError',
        message: 'Some domain error'
      })
    })
  })
})
