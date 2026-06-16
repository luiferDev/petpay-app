import * as amqp from 'amqplib'

import { Config } from '../config/env'
import { IEventPublisher } from '../../application/ports/IEventPublisher'
import { injectable } from 'tsyringe'
import { logger } from '../../shared/utils/logger'

const DOMAIN_EVENTS_EXCHANGE = Config.RABBITMQ_EXCHANGE || 'petpay.domain.events'
const DLX_EXCHANGE = DOMAIN_EVENTS_EXCHANGE + '.dlx'

@injectable()
export class RabbitMQEventPublisher implements IEventPublisher {
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null
  private connecting: boolean = false
  private shouldReconnect: boolean = true

  private baseDelay: number = 1000
  private maxDelay: number = 30000

  constructor () {
    void this.initializeConnection()
  }

  public get isConnected (): boolean {
    return this.channel !== null && this.connection !== null
  }

  private async reconnect (): Promise<void> {
    if (this.connecting) return
    this.connecting = true

    let delay = this.baseDelay
    while (this.shouldReconnect) {
      try {
        logger.info(`Attempting to reconnect to RabbitMQ in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        await this.initializeConnection()
        logger.info('RabbitMQ reconnected successfully')
        return
      } catch (error) {
        logger.error('RabbitMQ reconnection failed', {
          error: error instanceof Error ? error.message : String(error),
          nextRetryInMs: Math.min(delay * 2, this.maxDelay)
        })
        delay = Math.min(delay * 2, this.maxDelay)
      }
    }
  }

  private async initializeConnection (): Promise<void> {
    try {
      logger.info('Attempting to connect to RabbitMQ...')
      const conn = await amqp.connect(Config.RABBITMQ_URL)
      this.connection = conn as unknown as amqp.Connection

      conn.on('error', (err: any) => {
        logger.error('RabbitMQ connection error', { error: err.message })
        this.channel = null
        if (this.shouldReconnect) {
          void this.reconnect()
        }
      })

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed')
        this.channel = null
        this.connection = null
        if (this.shouldReconnect) {
          void this.reconnect()
        }
      })

      this.channel = await conn.createChannel()

      await this.channel.assertExchange(DLX_EXCHANGE, 'fanout', { durable: true })

      await this.channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', {
        durable: true,
        arguments: { 'x-dead-letter-exchange': DLX_EXCHANGE }
      })

      logger.info('RabbitMQ connection established and exchanges asserted.', {
        exchange: DOMAIN_EVENTS_EXCHANGE,
        dlx: DLX_EXCHANGE
      })
    } catch (error) {
      this.channel = null
      logger.error('Failed to connect to RabbitMQ. Events will not be published.', {
        url: Config.RABBITMQ_URL,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    } finally {
      this.connecting = false
    }
  }

  public async publish (routingKey: string, event: any): Promise<void> {
    if (this.channel == null) {
      logger.warn(`Cannot publish event: RabbitMQ channel not initialized. Event: ${routingKey}`)
      return
    }

    try {
      const message = JSON.stringify({
        ...event,
        publishedAt: new Date().toISOString()
      })

      this.channel.publish(
        DOMAIN_EVENTS_EXCHANGE,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now()
        }
      )

      logger.debug(`Event published: ${routingKey}`, { payload: event })
    } catch (error) {
      logger.error('Error publishing event to RabbitMQ', {
        routingKey,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  public async close (): Promise<void> {
    this.shouldReconnect = false
    this.connecting = false
    if (this.channel != null) {
      try { await this.channel.close() } catch {}
      this.channel = null
    }
    if (this.connection != null) {
      try { await this.connection.close() } catch {}
      this.connection = null
    }
    logger.info('RabbitMQ connection closed.')
  }
}
