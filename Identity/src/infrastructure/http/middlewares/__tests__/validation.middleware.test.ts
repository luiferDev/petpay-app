import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validate } from '../validation.middleware'

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  const testSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required')
  })

  beforeEach(() => {
    mockRequest = {
      body: {},
      path: '/test'
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    mockNext = vi.fn()
  })

  describe('6.4 Valid request passes validation', () => {
    it('should call next() when request body is valid', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John'
      }

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow optional fields when not provided', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John'
      }

      const schemaWithOptional = z.object({
        email: z.string().email(),
        phone: z.string().optional()
      })

      const middleware = validate(schemaWithOptional)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should pass validation with additional valid properties', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        age: 25
      }

      const looseSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8)
      })

      const middleware = validate(looseSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('6.5 Invalid request returns 400', () => {
    it('should return 400 when email is invalid', () => {
      mockRequest.body = {
        email: 'not-an-email',
        password: 'password123',
        firstName: 'John'
      }

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          error: 'Validation Error'
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 400 when password is too short', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'short',
        firstName: 'John'
      }

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          error: 'Validation Error',
          message: 'One or more fields are invalid.'
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 400 when required field is missing', () => {
      mockRequest.body = {
        email: 'test@example.com'
      }

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 400 when firstName is empty string', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: ''
      }

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should include validation error details in response', () => {
      mockRequest.body = {
        email: 'invalid',
        password: 'short'
      }

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              message: expect.any(String)
            })
          ])
        })
      )
    })

    it('should return 400 when body is empty', () => {
      mockRequest.body = {}

      const middleware = validate(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
