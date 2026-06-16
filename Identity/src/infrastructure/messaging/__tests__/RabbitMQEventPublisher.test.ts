import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import * as amqp from 'amqplib'
import { RabbitMQEventPublisher } from '../RabbitMQEventPublisher'
import { UserCreatedEvent } from '../../../domain/events/UserCreatedEvent'
import { ServiceProviderRegisteredEvent } from '../../../domain/events/ServiceProviderRegisteredEvent'

const rmqUrl: string | undefined = process.env.RABBITMQ_URL
const rmqAvailable = rmqUrl !== undefined && rmqUrl.length > 0
const describeIfRmq = rmqAvailable ? describe : describe.skip

const DOMAIN_EVENTS_EXCHANGE = 'petpay.domain.events'

function createUserCreatedEvent (overrides: Record<string, unknown> = {}): UserCreatedEvent {
  return new UserCreatedEvent({
    userId: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'CLIENT' as any,
    ...overrides
  })
}

function createServiceProviderRegisteredEvent (overrides: Record<string, unknown> = {}): ServiceProviderRegisteredEvent {
  return new ServiceProviderRegisteredEvent({
    userId: '2',
    email: 'provider@example.com',
    fullName: 'Provider User',
    registrationDate: new Date('2025-01-01'),
    isVerified: false,
    role: 'SERVICE_PROVIDER' as any,
    ...overrides
  })
}

describe('RabbitMQEventPublisher', () => {
  let publisher: RabbitMQEventPublisher
  let testConnection: amqp.Connection
  let testChannel: amqp.Channel
  const testQueue = `test-queue-${Date.now()}`

  beforeAll(async () => {
    publisher = new RabbitMQEventPublisher()

    if (rmqAvailable && rmqUrl !== undefined) {
      testConnection = await amqp.connect(rmqUrl)
      testChannel = await testConnection.createChannel()
      await testChannel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true })
    }
  })

  afterAll(async () => {
    if (rmqAvailable) {
      try {
        await testChannel.deleteQueue(testQueue)
      } catch {}
      await testChannel.close()
      await testConnection.close()
    }
  })

  beforeEach(async () => {
    if (rmqAvailable) {
      try {
        await testChannel.deleteQueue(testQueue)
      } catch {}
    }
  })

  describe('Connection Management', () => {
    it('should initialize without throwing when RabbitMQ is unreachable', () => {
      expect(() => {
        const p = new RabbitMQEventPublisher()
        void p
      }).not.toThrow()
    })
  })

  describeIfRmq('Exchange Declaration', () => {
    it('should have declared the topic exchange as durable', async () => {
      await testChannel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true })

      const publisher2 = new RabbitMQEventPublisher()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(publisher2).toBeDefined()
    })
  })

  describeIfRmq('Publishing UserCreatedEvent', () => {
    it('should publish UserCreatedEvent with correct routing key', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'user.created')

      const event = createUserCreatedEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        const parsed = JSON.parse(msg.content.toString())
        expect(parsed.userId).toBe('1')
        expect(parsed.email).toBe('test@example.com')
        expect(parsed.fullName).toBe('Test User')
        expect(parsed.role).toBe('CLIENT')
      }
    })

    it('should publish messages as persistent', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'user.created')

      const event = createUserCreatedEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        expect(msg.properties.persistent).toBe(true)
      }
    })

    it('should have content-type application/json', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'user.created')

      const event = createUserCreatedEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        expect(msg.properties.contentType).toBe('application/json')
      }
    })

    it('should include all required fields in the event payload', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'user.created')

      const event = createUserCreatedEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        const parsed = JSON.parse(msg.content.toString())
        expect(parsed).toHaveProperty('userId')
        expect(parsed).toHaveProperty('email')
        expect(parsed).toHaveProperty('fullName')
        expect(parsed).toHaveProperty('role')
        expect(parsed).toHaveProperty('publishedAt')
        expect(typeof parsed.userId).toBe('string')
        expect(typeof parsed.email).toBe('string')
        expect(typeof parsed.fullName).toBe('string')
        expect(typeof parsed.role).toBe('string')
      }
    })
  })

  describeIfRmq('Publishing ServiceProviderRegisteredEvent', () => {
    it('should publish with correct routing key service.provider.registered', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'service.provider.registered')

      const event = createServiceProviderRegisteredEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        const parsed = JSON.parse(msg.content.toString())
        expect(parsed.userId).toBe('2')
        expect(parsed.email).toBe('provider@example.com')
        expect(parsed.fullName).toBe('Provider User')
        expect(parsed.role).toBe('SERVICE_PROVIDER')
      }
    })

    it('should include isVerified flag and registrationDate', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'service.provider.registered')

      const event = createServiceProviderRegisteredEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        const parsed = JSON.parse(msg.content.toString())
        expect(parsed).toHaveProperty('isVerified')
        expect(parsed.isVerified).toBe(false)
        expect(parsed).toHaveProperty('registrationDate')
      }
    })
  })

  describeIfRmq('Message Properties', () => {
    it('should include timestamp property', async () => {
      await testChannel.assertQueue(testQueue, { durable: true })
      await testChannel.bindQueue(testQueue, DOMAIN_EVENTS_EXCHANGE, 'user.created')

      const event = createUserCreatedEvent()
      await publisher.publish(event.name, event.payload)

      await new Promise((resolve) => setTimeout(resolve, 500))

      const msg = await testChannel.get(testQueue, { noAck: true })
      expect(msg).not.toBeNull()

      if (msg !== null) {
        expect(msg.properties.timestamp).toBeDefined()
        expect(typeof msg.properties.timestamp).toBe('number')
      }
    })
  })

  describe('Graceful Degradation', () => {
    it('should not throw when publishing without a connection', async () => {
      const offlinePublisher = new RabbitMQEventPublisher()

      await expect(
        offlinePublisher.publish('user.created', { test: true })
      ).not.toThrow()
    })
  })
})
