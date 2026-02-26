// src/infrastructure/messaging/RabbitMQEventPublisher.ts

import amqp, { Channel, Connection } from 'amqplib'

import { Config } from '../config/env'
import { IEventPublisher } from '../../application/ports/IEventPublisher'
import { injectable } from 'tsyringe'
import { logger } from '../../shared/utils/logger'

/**
 * Nombre del Topic Exchange para eventos de dominio (estandarizado en la arquitectura).
 */
const DOMAIN_EVENTS_EXCHANGE = 'petpay.domain.events'

/**
 * @class RabbitMQEventPublisher
 * @implements {IEventPublisher}
 * @description Adaptador para la publicación de eventos de dominio a RabbitMQ.
 * Utiliza un Topic Exchange para comunicación asíncrona entre microservicios.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class RabbitMQEventPublisher implements IEventPublisher {
  private connection: Connection | null = null
  private channel: Channel | null = null

  constructor () {
    this.initializeConnection()
  }

  /**
   * @private
   * Establece la conexión inicial a RabbitMQ y asegura el Topic Exchange.
   */
  private async initializeConnection (): Promise<void> {
    try {
      logger.info('Attempting to connect to RabbitMQ...')
      this.connection = await amqp.connect(Config.RABBITMQ_URL)

      // Manejar errores de conexión (ej. reconexión, logging)
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error. Implement reconnection logic here.', { error: err.message })
      })

      this.channel = await this.connection.createChannel()

      // Declarar exchange como Topic para asegurar que exista (durable: true)
      await this.channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', {
        durable: true
      })

      logger.info('✅ RabbitMQ connection established and exchange asserted.', {
        exchange: DOMAIN_EVENTS_EXCHANGE
      })
    } catch (error) {
      logger.error('❌ Failed to connect to RabbitMQ. Events will not be published.', {
        url: Config.RABBITMQ_URL,
        error: error instanceof Error ? error.message : String(error)
      })
      // Si falla, el canal queda en null, permitiendo la degradación controlada.
    }
  }

  /**
   * {@inheritDoc}
   */
  public async publish (routingKey: string, event: any): Promise<void> {
    if (!this.channel) {
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
          persistent: true, // Mensaje persistente en disco
          contentType: 'application/json',
          timestamp: Date.now()
        }
      )

      logger.debug(`📤 Event published: ${routingKey}`, { payload: event })
    } catch (error) {
      logger.error('❌ Error publishing event to RabbitMQ', {
        routingKey,
        error: error instanceof Error ? error.message : String(error)
      })
      // El Use Case no debe esperar esto; solo se registra el error.
    }
  }

  /**
   * Cierra la conexión a RabbitMQ durante el cierre del servidor.
   */
  public async close (): Promise<void> {
    if (this.connection) {
      await this.connection.close()
      logger.info('✅ RabbitMQ connection closed.')
    }
  }
}
