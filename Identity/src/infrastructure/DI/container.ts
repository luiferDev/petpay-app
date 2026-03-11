// src/infrastructure/di/container.ts

import 'reflect-metadata' // Requerido por tsyringe para la inyección de metadatos

import { closeDatabase, getDb } from '../database/drizzle/client'

import { container } from 'tsyringe'

import { AuthController } from '../http/controllers/auth-controller'
import { Config } from '../config/env'
import { DrizzleUserAdapter } from '../database/repositories/DrizzleUserAdapter'
import { DrizzleAccountAdapter } from '../database/repositories/DrizzleAccountAdapter'
import { IEmailService } from '../../application/ports/IEmailService'
import type { IEventPublisher } from '../../application/ports/IEventPublisher'
import { INJECTION_TOKENS } from './InjectionTokens'
import { ITokenService } from '../../application/ports/ITokenService'
import { IAccountRepository } from '../../domain/repositories/IAccountRepository'
import { JwtTokenProvider } from '../services/JwtTokenProvider'
import { RedisService } from '../services/RedisService'
import { LoginUseCase } from '../../application/use-case/auth/LoginUseCase'
import { RefreshTokenUseCase } from '../../application/use-case/auth/RefreshTokenUseCase'
import { LogoutUseCase } from '../../application/use-case/auth/LogoutUseCase'
import { NodemailerService } from '../services/NodemailerService'
import { OAuthLoginUseCase } from '../../application/use-case/oauth/OAuthLoginUseCase'
import { OAuthUserAdapter } from '../database/repositories/OAuthUserAdapter'
import { LinkOAuthProviderUseCase } from '../../application/use-case/oauth/LinkOAuthProviderUseCase'
import { OAuthStateManager } from '../services/OAuthStateManager'
import { RegisterUserUseCase } from '../../application/use-case/auth/RegisterUserUseCase'
import { IRegistrationStrategy } from '../../application/ports/IRegistrationStrategy'
import { ClientRegistrationStrategy, ServiceProviderRegistrationStrategy } from '../../application/strategies/registration/UserRegisterStrategy'
import { AdminRegistrationStrategy } from '../../application/strategies/registration/AdminRegistrationStrategy'

// Simple console event publisher (no RabbitMQ dependency)
const consoleEventPublisher = {
  publish: async (event: string, payload: unknown): Promise<void> => {
    console.log(`[EVENT] ${event}:`, payload)
  },
  subscribe: async (event: string, _handler: (payload: unknown) => Promise<void>): Promise<void> => {
    console.log(`[SUBSCRIBE] ${event}`)
  },
  close: async (): Promise<void> => {
    console.log('[EVENT PUBLISHER] Closed')
  }
}

// --- INJECTION TOKENS ---
// (Defined in InjectionTokens.ts - imported above)

// --- DOMAIN / REPOSITORIES (Ports) ---
// OAuth User Repository: Maps IOAuthUserRepository to OAuthUserAdapter
container.register(INJECTION_TOKENS.OAUTH_USER_REPOSITORY, { useClass: OAuthUserAdapter })

// --- APPLICATION / USE CASES ---
// OAuth Login Use Case
container.register(INJECTION_TOKENS.OAUTH_LOGIN_USE_CASE, { useClass: OAuthLoginUseCase })

// OAuth Link Provider Use Case
container.register(INJECTION_TOKENS.OAUTH_LINK_USE_CASE, { useClass: LinkOAuthProviderUseCase })

// --- INFRASTRUCTURE / ADAPTERS ---

/**
 * @function setupDI
 * @description Configura el contenedor de Inyección de Dependencias (DI)
 * y realiza el mapeo de interfaces a implementaciones concretas.
 * @author Petpay Architecture Team
 */
export function setupDI (): void {
  // 1. REGISTRO DE INFRAESTRUCTURA BASE

  // Singleton para el cliente de Base de Datos (Drizzle)
  container.register(INJECTION_TOKENS.DB_CLIENT, { useFactory: () => getDb() })

  // 2. REGISTRO DE ADAPTADORES (Implementaciones de Puertos)
  // With @injectable() + @singleton() decorators, useClass works automatically

  // Repositorio: Mapea IUserRepository (Domain Port) a DrizzleUserAdapter (Infra Adapter)
  container.register(
    INJECTION_TOKENS.USER_REPOSITORY,
    { useClass: DrizzleUserAdapter }
  )

  // Repositorio: Mapea IAccountRepository (Domain Port) a DrizzleAccountAdapter (Infra Adapter)
  container.register<IAccountRepository>(
    INJECTION_TOKENS.ACCOUNT_REPOSITORY,
    { useClass: DrizzleAccountAdapter }
  )

  // Token Provider: Mapea ITokenService (App Port) to JwtTokenProvider (Infra Adapter)
  container.register<ITokenService>(
    INJECTION_TOKENS.TOKEN_PROVIDER,
    { useClass: JwtTokenProvider }
  )

  // Redis Service: For refresh token storage
  container.register(
    INJECTION_TOKENS.REDIS_SERVICE,
    { useClass: RedisService }
  )

  // Refresh Token Use Case
  container.register(
    'RefreshTokenUseCase',
    { useClass: RefreshTokenUseCase }
  )

  // Logout Use Case
  container.register(
    'LogoutUseCase',
    { useClass: LogoutUseCase }
  )

  // Event Publisher - using console publisher (RabbitMQ optional)
  container.registerInstance<IEventPublisher>(
    INJECTION_TOKENS.EVENT_PUBLISHER,
    consoleEventPublisher
  )

  // Email Service: Mapea IEmailService (App Port) a NodemailerService (Infra Adapter)
  container.register<IEmailService>(
    INJECTION_TOKENS.EMAIL_SERVICE,
    { useClass: NodemailerService }
  )

  // OAuth State Manager
  container.register(INJECTION_TOKENS.OAUTH_STATE_MANAGER, {
    useFactory: () => {
      const secret = Config.OAUTH_STATE_SECRET
      if (secret === null || secret === undefined || secret === '' || secret.length < 32) {
        throw new Error('OAUTH_STATE_SECRET must be at least 32 characters')
      }
      return new OAuthStateManager(secret)
    }
  })

  // 3. REGISTRO DE ESTRATEGIAS (Template Method)
  // Use factory to create a fresh Map with resolved strategies
  container.register(INJECTION_TOKENS.REGISTRATION_STRATEGIES, {
    useFactory: (c) => {
      const strategiesMap = new Map<string, IRegistrationStrategy>()
      strategiesMap.set('CLIENT', c.resolve(ClientRegistrationStrategy))
      strategiesMap.set('SERVICE_PROVIDER', c.resolve(ServiceProviderRegistrationStrategy))
      strategiesMap.set('ADMIN', c.resolve(AdminRegistrationStrategy))
      return strategiesMap
    }
  })

  // 4. REGISTRO DE CASOS DE USO (Application Services)
  // With @injectable() decorator, useClass automatically resolves dependencies
  container.register(INJECTION_TOKENS.REGISTER_USE_CASE, { useClass: RegisterUserUseCase })
  container.register(INJECTION_TOKENS.LOGIN_USE_CASE, { useClass: LoginUseCase })

  // VerifyEmailUseCase - commented out until implemented
  // container.register(INJECTION_TOKENS.VERIFY_EMAIL_USE_CASE, { useClass: VerifyEmailUseCase })

  // 5. REGISTRO DE CONTROLADORES (Presentation)
  // AuthController - register as singleton with manual resolution
  container.registerInstance(AuthController, new AuthController(
    container.resolve(RegisterUserUseCase),
    container.resolve(LoginUseCase)
  ))

  console.log('✅ Dependency Injection Container fully configured.')
}

/**
 * @function shutdownDI
 * @description Cierra todos los recursos gestionados por el contenedor (Base de Datos).
 */
export async function shutdownDI (): Promise<void> {
  await closeDatabase()
  console.log('✅ Dependency Injection shutdown complete.')
}
