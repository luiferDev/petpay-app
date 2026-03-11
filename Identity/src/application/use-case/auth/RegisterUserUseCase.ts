import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'

import {
  RegisterUserRequest,
  RegistrationStrategy,
  UserResponse
} from '../../dtos/RegisterUser.dto'
import { User, UserProps } from '../../../domain/entities/User'
import { Role } from '../../../domain/types/Role'

import type { IEventPublisher } from '../../ports/IEventPublisher'
import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { ServiceProviderRegisteredEvent } from '../../../domain/events/ServiceProviderRegisteredEvent'
import { UserAlreadyExistsError } from '../../../domain/errors/DomainError'
import { UserCreatedEvent } from '../../../domain/events/UserCreatedEvent'
import { hash } from 'bcrypt'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'

// DTOs que se definen en el siguiente paso

/**
 * @class RegisterUserUseCase
 * @description Caso de uso para registrar nuevos usuarios en la plataforma.
 * Orquesta la validación, persistencia, aplicación del Template Method (estrategia)
 * y la publicación del evento de dominio.
 * * ⚠️ Se utiliza la inyección del mapa de estrategias para mantener OCP y SOLID.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class RegisterUserUseCase {
  private readonly SALT_ROUNDS = 12

  constructor (
    @inject(INJECTION_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
    @inject(INJECTION_TOKENS.REGISTRATION_STRATEGIES)
    private readonly registrationStrategies: Map<string, RegistrationStrategy> // Inyección de estrategias
  ) { }

  /**
   * Ejecuta el caso de uso de registro de usuario.
   * * @param {RegisterUserRequest} request - Datos del usuario a registrar.
   * @returns {Promise<UserResponse>} Respuesta con datos esenciales del usuario creado.
   * @throws {UserAlreadyExistsError} Si el email ya está registrado.
   */
  public async execute (request: RegisterUserRequest): Promise<UserResponse> {
    const { email, password, firstName, lastName, role } = request

    // 1. Hashear la contraseña de forma segura (antes de crear la Entidad)
    const passwordHash = await hash(password, this.SALT_ROUNDS)

    // 2. Seleccionar Estrategia (Uso del Template Method inyectado)
    const strategy = this.registrationStrategies.get(role)
    if (strategy == null) {
      throw new Error(`Invalid registration role strategy: ${String(role)}`)
    }

    // 3. Crear entidad base
    const baseProps: UserProps = {
      email,
      passwordHash,
      firstName,
      lastName,
      roles: [role],
      isVerified: false
    }

    let user = new User(baseProps)

    // 4. Persistir el Aggregate Root primero (para obtener el ID)
    // Note: The existsByEmail check is now removed and handled by unique constraint
    // within the SERIALIZABLE transaction in DrizzleUserAdapter
    try {
      const savedUser = await this.userRepository.save(user)

      console.log('[RegisterUserUseCase] User saved successfully:', savedUser.id)

      // 5. Aplicar lógica específica del Template Method (p.ej., asignación de Account)
      // Ahora el usuario tiene un ID
      user = await strategy.applySpecifics(savedUser, request)

      // 6. Publicar Evento de Dominio (para comunicación asíncrona)
      // Evento genérico UserCreatedEvent (para logging, auditoría, etc.)
      if (savedUser.id === undefined) {
        throw new Error('User ID is required for event publishing')
      }
      const userCreatedEvent = new UserCreatedEvent({
        userId: savedUser.id,
        email: savedUser.email,
        fullName: `${String(savedUser.firstName)} ${String(savedUser.lastName)}`,
        role: savedUser.roles[0] as typeof Role
      })
      await this.eventPublisher.publish(userCreatedEvent.name, userCreatedEvent.payload)

      // Evento específico ServiceProviderRegisteredEvent (para Providers Service)
      if (savedUser.hasRole(Role.SERVICE_PROVIDER) === true) {
        if (savedUser.createdAt === undefined) {
          throw new Error('User createdAt is required for ServiceProviderRegisteredEvent')
        }
        const providerEvent = new ServiceProviderRegisteredEvent({
          userId: savedUser.id,
          email: savedUser.email,
          fullName: `${String(savedUser.firstName)} ${String(savedUser.lastName)}`,
          registrationDate: savedUser.createdAt,
          isVerified: savedUser.isVerified, // Debe ser false por la estrategia
          role: Role.SERVICE_PROVIDER
        })

        // Publicamos con la Routing Key 'service.provider.registered'
        await this.eventPublisher.publish(providerEvent.name, providerEvent.payload)
      }

      // 7. Retornar Respuesta (DTO)
      return {
        id: savedUser.id,
        email: savedUser.email,
        fullName: `${String(savedUser.firstName)} ${String(savedUser.lastName)}`,
        roles: savedUser.roles,
        isVerified: savedUser.isVerified
      }
    } catch (error: any) {
      // Handle unique constraint violations for email
      // PostgreSQL error code 23505 indicates unique violation
      if (error.code === '23505' || error.sqlState === '23505') {
        throw new UserAlreadyExistsError(`Email ${email} is already registered.`)
      }
      throw error
    }
  }
}
