import { describe, it, expect, beforeEach } from 'bun:test'
import { OAuthStateManager } from '../OAuthStateManager'

const TEST_SECRET = 'this-is-a-very-secure-secret-key-32chars!'

describe('OAuthStateManager', () => {
  let stateManager: OAuthStateManager

  beforeEach(() => {
    stateManager = new OAuthStateManager(TEST_SECRET)
  })

  describe('generateState()', () => {
    it('should produce state in correct format (timestamp:random:signature)', () => {
      const state = stateManager.generateState()

      const parts = state.split(':')
      expect(parts.length).toBe(3)
      expect(parts[0]).toMatch(/^\d+$/)
      expect(parts[1]).toMatch(/^[a-f0-9]{32}$/)
      expect(parts[2]).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce unique states on each call', () => {
      const state1 = stateManager.generateState()
      const state2 = stateManager.generateState()

      expect(state1).not.toBe(state2)
    })
  })

  describe('validateState()', () => {
    it('should accept valid state', () => {
      const state = stateManager.generateState()
      const result = stateManager.validateState(state, state)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.payload).toBeDefined()
      expect(result.payload?.timestamp).toBeDefined()
      expect(result.payload?.random).toBeDefined()
      expect(result.payload?.signature).toBeDefined()
    })

    it('should reject tampered signature', () => {
      const state = stateManager.generateState()
      const parts = state.split(':')
      const tamperedState = `${parts[0] as string}:${parts[1] as string}:${'a'.repeat(64)}`

      const result = stateManager.validateState(tamperedState, tamperedState)

      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Invalid state signature')
    })

    it('should reject tampered random part', () => {
      const state = stateManager.generateState()
      const parts = state.split(':')
      const tamperedState = `${parts[0] as string}:${'b'.repeat(32)}:${parts[2] as string}`

      const result = stateManager.validateState(tamperedState, tamperedState)

      expect(result.isValid).toBe(false)
      expect(result.error?.message).toBe('Invalid state signature')
    })

    it('should reject missing cookie state', () => {
      const state = stateManager.generateState()

      const result = stateManager.validateState(state, '')

      expect(result.isValid).toBe(false)
      expect(result.error?.message).toBe('Missing state parameter')
    })

    it('should reject empty state', () => {
      const result = stateManager.validateState('', '')

      expect(result.isValid).toBe(false)
      expect(result.error?.message).toBe('Missing state parameter')
    })

    it('should reject state mismatch between request and cookie', () => {
      const state1 = stateManager.generateState()
      const state2 = stateManager.generateState()

      const result = stateManager.validateState(state1, state2)

      expect(result.isValid).toBe(false)
      expect(result.error?.message).toBe('State mismatch between request and cookie')
    })

    it('should reject invalid state format (missing parts)', () => {
      const result = stateManager.validateState('invalid-format', 'invalid-format')

      expect(result.isValid).toBe(false)
      expect(result.error?.message).toBe('Invalid state format')
    })

    it('should reject invalid timestamp', () => {
      const state = stateManager.generateState()
      const parts = state.split(':')
      const invalidState = `not-a-number:${parts[1] as string}:${parts[2] as string}`

      const result = stateManager.validateState(invalidState, invalidState)

      expect(result.isValid).toBe(false)
      expect(result.error?.message).toBe('Invalid timestamp in state')
    })
  })

  describe('isExpired()', () => {
    it('should return false for recent timestamp', () => {
      const recentTimestamp = Date.now() - (5 * 60 * 1000)
      const isExpired = stateManager.isExpired(recentTimestamp, 10 * 60 * 1000)

      expect(isExpired).toBe(false)
    })

    it('should return true for old timestamp', () => {
      const oldTimestamp = Date.now() - (15 * 60 * 1000)
      const isExpired = stateManager.isExpired(oldTimestamp, 10 * 60 * 1000)

      expect(isExpired).toBe(true)
    })

    it('should return false for timestamp exactly at max age', () => {
      const maxAgeTimestamp = Date.now() - (10 * 60 * 1000)
      const isExpired = stateManager.isExpired(maxAgeTimestamp, 10 * 60 * 1000)

      expect(isExpired).toBe(false)
    })
  })
})
