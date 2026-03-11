import Redis from 'ioredis'
import { IRedisService } from '../../application/ports/IRedisService'
import { Config } from '../config/env'
import { injectable } from 'tsyringe'
import { logger } from '../../shared/utils/logger'

/**
 * @class RedisService
 * @description Implementación del puerto IRedisService usando ioredis.
 * Maneja la conexión con Redis para almacenar refresh tokens.
 * @author Petpay Architecture Team
 */
@injectable()
export class RedisService implements IRedisService {
  private readonly client: Redis

  constructor () {
    const redisOptions: Redis.RedisOptions = {
      host: Config.REDIS_HOST,
      port: Config.REDIS_PORT,
      db: Config.REDIS_DB,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection retry exhausted', { times })
          return null // Stop retrying
        }
        return Math.min(times * 100, 3000) // Exponential backoff
      }
    }

    // Use REDIS_URL if provided, otherwise use individual config
    if (Config.REDIS_URL !== undefined && Config.REDIS_URL !== '') {
      redisOptions.lazyConnect = true
      this.client = new Redis(Config.REDIS_URL, redisOptions)
    } else if (Config.REDIS_PASSWORD !== undefined && Config.REDIS_PASSWORD !== '') {
      redisOptions.password = Config.REDIS_PASSWORD
      this.client = new Redis(redisOptions)
    } else {
      this.client = new Redis(redisOptions)
    }

    // Handle connection events
    this.client.on('connect', () => {
      logger.info('Redis connected', { host: Config.REDIS_HOST, port: Config.REDIS_PORT })
    })

    this.client.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message })
    })

    this.client.on('close', () => {
      logger.warn('Redis connection closed')
    })

    // Try to connect (non-blocking)
    this.client.connect().catch((error) => {
      logger.warn('Redis initial connection failed (running in stateless mode)', {
        error: error instanceof Error ? error.message : String(error)
      })
    })
  }

  /**
   * {@inheritDoc}
   */
  async get (key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (error) {
      logger.error('Redis GET error', { key, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * {@inheritDoc}
   */
  async set (key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.setex(key, ttlSeconds, value)
      logger.debug('Redis SET', { key, ttlSeconds })
    } catch (error) {
      logger.error('Redis SET error', { key, ttlSeconds, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * {@inheritDoc}
   */
  async delete (key: string): Promise<void> {
    try {
      await this.client.del(key)
      logger.debug('Redis DELETE', { key })
    } catch (error) {
      logger.error('Redis DELETE error', { key, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * {@inheritDoc}
   */
  isConnected (): boolean {
    return this.client.status === 'ready'
  }

  /**
   * {@inheritDoc}
   */
  async close (): Promise<void> {
    try {
      await this.client.quit()
      logger.info('Redis connection closed gracefully')
    } catch (error) {
      logger.error('Error closing Redis connection', { error: error instanceof Error ? error.message : String(error) })
    }
  }
}
