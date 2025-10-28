import 'dotenv/config'
import { DIContainer } from './DIContainer'
import { EmailService } from '../services/EmailService'
import { AuthService } from '../services/auth-service'
import { AuthController } from '../controllers/auth-controller'
import { createNodemailerTransport } from '../utils/nodemailer'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaUserRepository } from '../model/prisma-user-repository'

/**
 * Bootstrap file: central place to wire concrete implementations.
 * Keep this file as the only place that imports concrete classes so the
 * rest of the application depends only on interfaces/abstractions.
 */
export const bootstrap = async (): Promise<void> => {
  const container = DIContainer.getInstance()

  // Create concrete resources
  const prisma = new PrismaClient()
  const emailTransport = createNodemailerTransport()

  // Register providers (use factories for dependent services so resolution is lazy)
  container.register('EmailTransport', () => emailTransport)
  container.register('IEmailService', () => new EmailService(container.get('EmailTransport')))
  container.register('IUserRepository', () => new PrismaUserRepository(prisma))

  // AuthService depends on IUserRepository and IEmailService; register a factory
  container.register('IAuthService', () => new AuthService(
    container.get('IUserRepository'),
    container.get('IEmailService')
  ))

  // Controller depends on IAuthService
  container.register('AuthController', () => new AuthController(container.get('IAuthService')))
}

// Optionally auto-bootstrap on import (server should import this before routes)
bootstrap().catch(err => {
  // Avoid throwing during import; log instead
  // eslint-disable-next-line no-console
  console.error('Error during bootstrap:', err)
})
