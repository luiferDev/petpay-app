import * as amqp from 'amqplib'
import { Config } from '../config/env'
import { logger } from '../../shared/utils/logger'

const DOMAIN_EVENTS_EXCHANGE = Config.RABBITMQ_EXCHANGE || 'petpay.domain.events'

export class RabbitMQEventConsumer {
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null
  private shouldReconnect: boolean = true
  private readonly QUEUE = 'identity-event-queue'
  private readonly ROUTING_KEYS = ['booking.#', 'payment.#']

  async start (): Promise<void> {
    try {
      this.connection = await amqp.connect(Config.RABBITMQ_URL)
      this.channel = await this.connection.createChannel()

      await this.channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true })
      const queue = await this.channel.assertQueue(this.QUEUE, { durable: true })

      for (const key of this.ROUTING_KEYS) {
        await this.channel.bindQueue(queue.queue, DOMAIN_EVENTS_EXCHANGE, key)
      }

      logger.info(`RabbitMQ consumer listening on ${this.QUEUE}`, {
        exchange: DOMAIN_EVENTS_EXCHANGE,
        routingKeys: this.ROUTING_KEYS
      })

      await this.channel.consume(queue.queue, (msg) => {
        if (!msg) return
        try {
          const content = JSON.parse(msg.content.toString())
          logger.info(`Received event: ${msg.fields.routingKey}`, content)
          this.channel!.ack(msg)
        } catch (error) {
          logger.error('Error processing RabbitMQ message', error)
          this.channel!.nack(msg, false, false)
        }
      })

      this.connection.on('close', () => {
        logger.warn('RabbitMQ consumer connection closed, reconnecting...')
        this.channel = null
        this.connection = null
        if (this.shouldReconnect) {
          setTimeout(() => this.start(), 5000)
        }
      })

      this.connection.on('error', (err: any) => {
        logger.error('RabbitMQ consumer connection error', { error: err.message })
      })
    } catch (error) {
      logger.error('Failed to start RabbitMQ consumer', error)
      if (this.shouldReconnect) {
        setTimeout(() => this.start(), 5000)
      }
    }
  }

  async close (): Promise<void> {
    this.shouldReconnect = false
    if (this.channel != null) {
      try { await this.channel.close() } catch {}
      this.channel = null
    }
    if (this.connection != null) {
      try { await this.connection.close() } catch {}
      this.connection = null
    }
  }
}
