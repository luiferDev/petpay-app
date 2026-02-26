import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'

process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'
process.env.ACCESS_TOKEN_EXPIRY = '15m'
process.env.REFRESH_TOKEN_EXPIRY = '7d'
process.env.RABBITMQ_URL = 'amqp://test:test@localhost:5672'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret-key-32chars-long'
process.env.NODE_ENV = 'test'
process.env.EMAIL_SERVICE = 'gmail'
process.env.EMAIL_USER = 'test@petpay.com'
process.env.EMAIL_PASSWORD = 'test-password'

const mockSend = vi.fn()

vi.mock('email-templates', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      send: mockSend
    }))
  }
})

vi.mock('../../shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

const { NodemailerService } = await import('../NodemailerService')

describe('NodemailerService', () => {
  let nodemailerService: NodemailerService

  beforeEach(() => {
    vi.clearAllMocks()
    nodemailerService = new NodemailerService()
  })

  describe('5.5 sendEmail sends successfully', () => {
    it('should send email successfully and return success response', async () => {
      mockSend.mockResolvedValue({
        messageId: '<test-message-id@example.com>',
        accepted: ['test@example.com'],
        rejected: []
      })

      const result = await nodemailerService.send(
        'welcome',
        'test@example.com',
        'Welcome to Petpay',
        { name: 'John' }
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('<test-message-id@example.com>')
      expect(result.error).toBeUndefined()
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith({
        template: 'welcome',
        message: expect.objectContaining({
          to: 'test@example.com',
          subject: 'Welcome to Petpay'
        }),
        locals: { name: 'John' }
      })
    })

    it('should send email with all required parameters', async () => {
      mockSend.mockResolvedValue({
        messageId: '<another-message-id@example.com>',
        accepted: ['recipient@example.com'],
        rejected: []
      })

      const result = await nodemailerService.send(
        'password-reset',
        'recipient@example.com',
        'Reset your password',
        { resetToken: 'abc123' }
      )

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith({
        template: 'password-reset',
        message: expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Reset your password'
        }),
        locals: { resetToken: 'abc123' }
      })
    })
  })

  describe('5.6 sendEmail handles failure', () => {
    it('should return failure response when send fails', async () => {
      mockSend.mockRejectedValue(new Error('SMTP connection failed'))

      const result = await nodemailerService.send(
        'welcome',
        'test@example.com',
        'Welcome to Petpay',
        { name: 'John' }
      )

      expect(result.success).toBe(false)
      expect(result.messageId).toBeUndefined()
      expect(result.error).toBe('SMTP connection failed')
    })

    it('should handle network errors gracefully', async () => {
      mockSend.mockRejectedValue(new Error('ENOTFOUND - DNS lookup failed'))

      const result = await nodemailerService.send(
        'welcome',
        'test@example.com',
        'Welcome to Petpay',
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('ENOTFOUND')
    })

    it('should handle invalid credentials error', async () => {
      mockSend.mockRejectedValue(new Error('Invalid login credentials'))

      const result = await nodemailerService.send(
        'welcome',
        'test@example.com',
        'Welcome to Petpay',
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid login credentials')
    })

    it('should handle non-Error objects gracefully', async () => {
      mockSend.mockRejectedValue('Unknown error occurred')

      const result = await nodemailerService.send(
        'welcome',
        'test@example.com',
        'Welcome to Petpay',
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
    })
  })
})
