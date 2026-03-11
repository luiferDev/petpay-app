import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test'
import { RedisService } from '../RedisService'

// Mock ioredis
const mockGet = vi.fn()
const mockSetex = vi.fn()
const mockDel = vi.fn()
const mockQuit = vi.fn()
const mockOn = vi.fn()
const mockConnect = vi.fn()

const mockRedis = {
  get: mockGet,
  setex: mockSetex,
  del: mockDel,
  quit: mockQuit,
  on: mockOn,
  connect: mockConnect,
  status: 'ready'
}

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis)
}))

describe('RedisService', () => {
  let redisService: RedisService

  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(null)
    mockSetex.mockResolvedValue('OK')
    mockDel.mockResolvedValue(1)
    mockConnect.mockResolvedValue(undefined)

    redisService = new RedisService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('should return value when key exists', async () => {
      mockGet.mockResolvedValue('test-value')

      const result = await redisService.get('test-key')

      expect(result).toBe('test-value')
      expect(mockGet).toHaveBeenCalledWith('test-key')
    })

    it('should return null when key does not exist', async () => {
      mockGet.mockResolvedValue(null)

      const result = await redisService.get('nonexistent-key')

      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('Redis error'))

      const result = await redisService.get('test-key')

      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('should store value with TTL', async () => {
      await redisService.set('test-key', 'test-value', 3600)

      expect(mockSetex).toHaveBeenCalledWith('test-key', 3600, 'test-value')
    })

    it('should throw error on failure', async () => {
      mockSetex.mockRejectedValue(new Error('Redis error'))

      await expect(redisService.set('test-key', 'test-value', 3600)).rejects.toThrow('Redis error')
    })
  })

  describe('delete', () => {
    it('should delete key', async () => {
      await redisService.delete('test-key')

      expect(mockDel).toHaveBeenCalledWith('test-key')
    })

    it('should throw error on failure', async () => {
      mockDel.mockRejectedValue(new Error('Redis error'))

      await expect(redisService.delete('test-key')).rejects.toThrow('Redis error')
    })
  })

  describe('isConnected', () => {
    it('should return true when status is ready', () => {
      mockRedis.status = 'ready'
      expect(redisService.isConnected()).toBe(true)
    })

    it('should return false when status is not ready', () => {
      mockRedis.status = 'wait'
      expect(redisService.isConnected()).toBe(false)
    })
  })
})
