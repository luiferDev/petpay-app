// src/infrastructure/di/container.ts

import 'reflect-metadata'; // Requerido por tsyringe para la inyección de metadatos

import { closeDatabase, getDb } from '../database/drizzle/client';

import { AdminRegistration } from '../../application/strategies/registration/AdminRegistration';
import { AuthController } from '../http/controllers/AuthController'; // Controller Express (a implementar)
import { ClientRegistration } from '../../application/strategies/registration/ClientRegistration';
import { Config } from '../config/env';
import { DrizzleUserRepository } from '../database/repositories/DrizzleUserRepository';
import { IEmailService } from '../../application/ports/IEmailService';
import { IEventPublisher } from '../../application/ports/IEventPublisher';
import { INJECTION_TOKENS } from './InjectionTokens';
import { ITokenProvider } from '../../application/ports/ITokenProvider';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { JwtTokenProvider } from '../services/JwtTokenProvider';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { NodemailerService } from '../services/NodemailerService';
import { RabbitMQEventPublisher } from '../messaging/RabbitMQEventPublisher';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase';
import { RegistrationStrategy } from '../../application/dtos/RegisterUserDTOs';
import { ServiceProviderRegistration } from '../../application/strategies/registration/ServiceProviderRegistration';
import { VerifyEmailUseCase } from '../../application/use-cases/auth/VerifyEmailUseCase'; // Asumiendo que se creará
import { container } from 'tsyringe';

// --- INJECTION TOKENS ---


// --- DOMAIN / REPOSITORIES (Ports) ---


// --- APPLICATION / PORTS ---





// --- APPLICATION / USE CASES ---




// --- APPLICATION / STRATEGIES (Template Method Implementations) ---
// (Estas clases deben ser movidas y refactorizadas a la nueva ubicación)




// --- INFRASTRUCTURE / ADAPTERS ---








/**
 * @function setupDI
 * @description Configura el contenedor de Inyección de Dependencias (DI)
 * y realiza el mapeo de interfaces a implementaciones concretas.
 * @author Petpay Architecture Team
 */
export function setupDI(): void {
  // 1. REGISTRO DE INFRAESTRUCTURA BASE
  
  // Singleton para el cliente de Base de Datos (Drizzle)
  container.register(INJECTION_TOKENS.DB_CLIENT, { useFactory: () => getDb() });

  // 2. REGISTRO DE ADAPTADORES (Implementaciones de Puertos)
  
  // Repositorio: Mapea IUserRepository (Domain Port) a DrizzleUserRepository (Infra Adapter)
  container.register<IUserRepository>(
    INJECTION_TOKENS.USER_REPOSITORY, 
    { useClass: DrizzleUserRepository }
  );

  // Token Provider: Mapea ITokenProvider (App Port) a JwtTokenProvider (Infra Adapter)
  container.register<ITokenProvider>(
    INJECTION_TOKENS.TOKEN_PROVIDER, 
    { useClass: JwtTokenProvider }
  );

  // Publicador de Eventos: Mapea IEventPublisher (App Port) a RabbitMQEventPublisher (Infra Adapter)
  // Nota: RabbitMQEventPublisher se inicializa inmediatamente para conectar el canal.
  container.register<IEventPublisher>(
    INJECTION_TOKENS.EVENT_PUBLISHER, 
    { useFactory: () => container.resolve(RabbitMQEventPublisher) } // Usamos resolve para que el constructor de RabbitMQ se ejecute
  );

  // Email Service: Mapea IEmailService (App Port) a NodemailerService (Infra Adapter)
  container.register<IEmailService>(
    INJECTION_TOKENS.EMAIL_SERVICE, 
    { useClass: NodemailerService }
  );
  
  // 3. REGISTRO DE ESTRATEGIAS (Template Method)
  // Creamos un mapa de estrategias para inyectarlo en RegisterUserUseCase
  const registrationStrategiesMap = new Map<string, RegistrationStrategy>();
  registrationStrategiesMap.set('CLIENT', container.resolve(ClientRegistration));
  registrationStrategiesMap.set('SERVICE_PROVIDER', container.resolve(ServiceProviderRegistration));
  registrationStrategiesMap.set('ADMIN', container.resolve(AdminRegistration));

  container.register(INJECTION_TOKENS.REGISTRATION_STRATEGIES, { 
    useValue: registrationStrategiesMap 
  });


  // 4. REGISTRO DE CASOS DE USO (Application Services)
  
  // RegisterUserUseCase (Recibe UserRepository, EventPublisher, StrategiesMap)
  container.register(INJECTION_TOKENS.REGISTER_USE_CASE, { useClass: RegisterUserUseCase });

  // LoginUseCase (Recibe UserRepository, TokenProvider)
  container.register(INJECTION_TOKENS.LOGIN_USE_CASE, { useClass: LoginUseCase });

  // VerifyEmailUseCase (A crear, asume que recibe UserRepository, TokenProvider)
  container.register(INJECTION_TOKENS.VERIFY_EMAIL_USE_CASE, { useClass: VerifyEmailUseCase });


  // 5. REGISTRO DE CONTROLADORES (Presentation)
  // AuthController (Recibe RegisterUseCase, LoginUseCase, VerifyEmailUseCase)
  container.register(AuthController, { useClass: AuthController });

  console.log('✅ Dependency Injection Container fully configured.');
}

/**
 * @function shutdownDI
 * @description Cierra todos los recursos gestionados por el contenedor (Base de Datos, RabbitMQ).
 */
export async function shutdownDI(): Promise<void> {
    const rabbitPublisher = container.resolve(RabbitMQEventPublisher);
    await rabbitPublisher.close();
    await closeDatabase();
    console.log('✅ Dependency Injection shutdown complete.');
}