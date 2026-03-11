// src/shared/utils/__tests__/concurrency.test.ts

import { describe, it, expect, mock, beforeEach } from 'bun:test'
import {
  isSerializationError,
  executeWithRetry,
  withAdvisoryLock,
  RetryConfig,
  LockConfig
} from '../concurrency'

describe('concurrency utilities', () => {
  describe('isSerializationError', () => {
    it('should return true for PostgreSQL error code 40001', () => {
      const error = { code: '40001' }
      expect(isSerializationError(error)).toBe(true)
    })

    it('should return true for SQL state 40001', () => {
      const error = { sqlState: '40001' }
      expect(isSerializationError(error)).toBe(true)
    })

    it('should return false for other error codes', () => {
      const error = { code: '23505' }
      expect(isSerializationError(error)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isSerializationError(null)).toBe(false)
      expect(isSerializationError(undefined)).toBe(false)
    })
  })

  describe('executeWithRetry', () => {
    const defaultConfig: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 1000,
      backoffFactor: 2
    }

    it('should succeed on first attempt', async () => {
      const operation = mock(async () => await Promise.resolve('success'))
      const result = await executeWithRetry(
        operation,
        defaultConfig,
        () => false
      )
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on serialization failure', async () => {
      const operation = mock()
        .mockImplementationOnce(async () => await Promise.reject(new Error('40001')))
        .mockImplementationOnce(async () => await Promise.resolve('success'))

      const result = await executeWithRetry(
        operation,
        defaultConfig,
        (error) => error.code === '40001'
      )

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      const operation = mock(async () => await Promise.reject(new Error('40001')))

      await expect(
        executeWithRetry(
          operation,
          { ...defaultConfig, maxRetries: 2 },
          (error) => error.code === '40001'
        )
      ).rejects.toHaveProperty('code', '40001')

      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry non-retryable errors', async () => {
      const operation = mock(async () => await Promise.reject(new Error('23505')))

      await expect(
        executeWithRetry(
          operation,
          defaultConfig,
          (error) => error.code === '40001'
        )
      ).rejects.toHaveProperty('code', '23505')

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use exponential backoff', async () => {
      const delays: number[] = []
      const originalSetTimeout = global.setTimeout

      // Mock setTimeout to track delays
      global.setTimeout = mock((callback: any, delay: number) => {
        delays.push(delay)
        return originalSetTimeout(callback, 1)
      }) as any

      const operation = mock()
        .mockImplementationOnce(async () => await Promise.reject(new Error('40001')))
        .mockImplementationOnce(async () => await Promise.reject(new Error('40001')))
        .mockImplementationOnce(async () => await Promise.resolve('success'))

      await executeWithRetry(
        operation,
        { ...defaultConfig, initialDelayMs: 10, backoffFactor: 2 },
        (error) => error.code === '40001'
      )

      // First delay should be 10ms, second should be 20ms
      expect(delays[0]).toBe(10)
      expect(delays[1]).toBe(20)

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout
    })
  })

  describe('withAdvisoryLock', () => {
    let mockDb: any
    let mockQuery: any

    beforeEach(() => {
      mockQuery = mock(async () => await Promise.resolve())
      mockDb = {
        _: {
          dialect: 'pg',
          session: {
            client: {
              query: mockQuery
            }
          }
        }
      }
    })

    it('should acquire lock and execute operation', async () => {
      const operation = mock(async () => await Promise.resolve('locked-result'))
      const config: LockConfig = { timeoutMs: 5000 }

      const result = await withAdvisoryLock(mockDb, 12345, config, operation)

      expect(result).toBe('locked-result')
      expect(operation).toHaveBeenCalledTimes(1)
      expect(mockQuery).toHaveBeenCalled()
    })

    it('should release lock after operation completes', async () => {
      const operation = mock(async () => await Promise.resolve())
      const config: LockConfig = { timeoutMs: 5000 }

      await withAdvisoryLock(mockDb, 12345, config, operation)

      // Should have called query twice (acquire and release)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('should release lock even if operation fails', async () => {
      const operation = mock(async () => await Promise.reject(new Error('Operation failed')))
      const config: LockConfig = { timeoutMs: 5000 }

      await expect(
        withAdvisoryLock(mockDb, 12345, config, operation)
      ).rejects.toThrow('Operation failed')

      // Should still call query for release (even though operation failed)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('should handle lock timeout', async () => {
      const timeoutError = new Error('lock timeout')
      ;(timeoutError as any).code = '57014'
      const timeoutQuery = mock(async () => await Promise.reject(timeoutError))
      mockDb._.session.client.query = timeoutQuery

      const operation = mock(async () => await Promise.resolve())
      const config: LockConfig = { timeoutMs: 100 }

      await expect(
        withAdvisoryLock(mockDb, 12345, config, operation)
      ).rejects.toThrow('Lock timeout')

      expect(operation).not.toHaveBeenCalled()
    })
  })
})
