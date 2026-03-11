// src/shared/utils/concurrency.ts

import { type DbClient } from '../../infrastructure/database/drizzle/client'
import { logger } from './logger'

/**
 * @typedef {RetryConfig}
 * @description Configuration for transaction retry logic with exponential backoff.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Initial delay in milliseconds between retries */
  initialDelayMs: number
  /** Maximum delay in milliseconds (cap for exponential backoff) */
  maxDelayMs: number
  /** Factor to multiply delay by for each subsequent retry */
  backoffFactor: number
}

/**
 * @typedef {LockConfig}
 * @description Configuration for advisory lock management.
 */
export interface LockConfig {
  /** Timeout in milliseconds for acquiring the lock */
  timeoutMs: number
}

/**
 * @function isSerializationError
 * @description Checks if an error is a PostgreSQL serialization failure.
 * PostgreSQL error code 40001 indicates serialization failure in SERIALIZABLE isolation.
 * @param {any} error - The error object to check.
 * @returns {boolean} True if the error is a serialization failure.
 */
export function isSerializationError (error: any): boolean {
  return error?.code === '40001' || error?.sqlState === '40001'
}

/**
 * @function executeWithRetry
 * @description Executes an operation with retry logic for serializable transaction failures.
 * Uses exponential backoff between retries.
 * @param {() => Promise<T>} operation - The operation to execute.
 * @param {RetryConfig} config - Retry configuration.
 * @param {(error: any) => boolean} isRetryableError - Function to determine if error is retryable.
 * @returns {Promise<T>} Result of the operation.
 * @throws {Error} If max retries exceeded or non-retryable error occurs.
 */
export async function executeWithRetry<T> (
  operation: () => Promise<T>,
  config: RetryConfig,
  isRetryableError: (error: any) => boolean
): Promise<T> {
  let lastError: any = null
  let currentDelay = config.initialDelayMs

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Check if error is retryable and we haven't exceeded max retries
      const isRetryable = isRetryableError(error)
      const isLastAttempt = attempt === config.maxRetries

      if (!isRetryable || isLastAttempt) {
        logger.warn(`Operation failed after ${attempt} attempt(s)`, {
          attempt,
          maxRetries: config.maxRetries,
          error: error.message,
          isRetryable
        })
        throw error
      }

      // Log retry attempt
      logger.warn('Serialization failure detected, retrying...', {
        attempt,
        maxRetries: config.maxRetries,
        delayMs: currentDelay
      })

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, currentDelay))

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * config.backoffFactor, config.maxDelayMs)
    }
  }

  // This should never be reached due to the throw in the loop
  throw lastError
}

/**
 * @function withAdvisoryLock
 * @description Executes an operation while holding a PostgreSQL advisory lock.
 * The lock is automatically released in a finally block.
 * @param {DbClient} db - The database client.
 * @param {number} lockKey - The lock key (must be a 64-bit integer).
 * @param {LockConfig} config - Lock configuration.
 * @param {() => Promise<T>} operation - The operation to execute while holding the lock.
 * @returns {Promise<T>} Result of the operation.
 * @throws {Error} If lock cannot be acquired within timeout.
 */
export async function withAdvisoryLock<T> (
  db: DbClient,
  lockKey: number,
  config: LockConfig,
  operation: () => Promise<T>
): Promise<T> {
  let lockAcquired = false

  try {
    // Acquire advisory lock using PostgreSQL's pg_advisory_lock
    // This is a blocking call, but we set a statement timeout
    const internalDb = db
    const isPostgres = internalDb._?.dialect === 'pg'
    const hasQuery = internalDb._?.session?.client?.query !== undefined
    if (isPostgres && hasQuery) {
      const timeoutSec = Math.floor(config.timeoutMs / 1000)
      const query = db._.session.client.query(
        `SET LOCAL lock_timeout = '${timeoutSec}s'; SET LOCAL statement_timeout = '${timeoutSec}s'; SELECT pg_advisory_lock(${lockKey});`
      )
      await query
    }

    lockAcquired = true
    logger.debug('Advisory lock acquired', { lockKey })

    // Execute the operation while holding the lock
    return await operation()
  } catch (error: unknown) {
    // 1. Check if error is an object and not null
    const isErrorObj = typeof error === 'object' && error !== null

    // 2. Safely extract values with explicit type checks to satisfy the linter
    const errorCode = isErrorObj && 'code' in error ? String((error as any).code) : undefined
    const errorMessage = isErrorObj && 'message' in error ? String((error as any).message) : ''

    if (errorCode === '57014' || errorMessage.includes('lock timeout')) {
      logger.error('Advisory lock timeout', { lockKey, timeoutMs: config.timeoutMs })
      throw new Error(`Lock timeout: Could not acquire lock for key ${String(lockKey)}`)
    }
    throw error
  } finally {
    // Always release the lock
    if (lockAcquired) {
      try {
        const internalDb = db
        const isPostgres = internalDb._?.dialect === 'pg'
        const hasQuery = internalDb._?.session?.client?.query !== undefined
        if (isPostgres && hasQuery) {
          await internalDb._.session.client.query(`SELECT pg_advisory_unlock(${lockKey});`)
        }
        logger.debug('Advisory lock released', { lockKey })
      } catch (releaseError) {
        logger.warn('Failed to release advisory lock', { lockKey, error: releaseError })
      }
    }
  }
}
