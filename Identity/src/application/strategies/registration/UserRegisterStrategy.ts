// src/application/strategies/registration/UserRegisterStrategy.ts (REEMPLAZA UserRegisterTemplate.ts)

import { User, UserProps } from '../../../domain/entities/User'

import { AccountType } from '../../../domain/types/AccountType'
import { IAccountRepository } from '../../ports/IAccountRepository' // Nuevo Port
import { IRegistrationStrategy } from '../../ports/IRegistrationStrategy'
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto'
import { Role } from '../../../domain/types/Role'
import { hash } from 'bcrypt'

/**
 * @class BaseRegistrationStrategy
 * @description Implementación base del IRegistrationStrategy para manejar la lógica común
 * de la creación de Account. Reemplaza el Template Method anterior.
 * * Esta clase es de la Capa de Aplicación, pero sus dependencias son Ports.
 */
export abstract class BaseRegistrationStrategy implements IRegistrationStrategy {
  // Inyectamos el repositorio de Account, no el Drizzle DB.
  constructor (
    protected readonly accountRepository: IAccountRepository
  ) {}

  /**
     * @abstract
     * @description Asigna roles globales y realiza la lógica específica del rol.
     * @param {User} user - Entidad User.
     * @param {RegisterUserRequest} request - Request original.
     * @returns {Promise<User>}
     */
  protected abstract assignSpecifics (user: User, request: RegisterUserRequest): Promise<User>

  /**
     * Ejecuta el proceso de registro específico del rol.
     * @param {User} user - El Aggregate Root User recién creado.
     * @param {RegisterUserRequest} request - El request original.
     * @returns {Promise<User>}
     */
  public async applySpecifics (user: User, request: RegisterUserRequest): Promise<User> {
    // 1. Crear una cuenta por defecto (Lógica de negocio estándar)
    const account = await this.accountRepository.createAccountAndAssignOwner(
            `${request.firstName}'s Account`, // Nombre simple por defecto
            AccountType.INDIVIDUAL,
            user.id!
    )

    // 2. Aplicar lógica específica (la parte que varía)
    return await this.assignSpecifics(user, request)
  }
}

// ----------------------------------------------------------------------------------
// Subclases Concretas Refactorizadas (Ahora solo se enfocan en la lógica de rol)
// ----------------------------------------------------------------------------------

/**
 * @class ClientRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo CLIENT.
 */
export class ClientRegistrationStrategy extends BaseRegistrationStrategy {
  protected async assignSpecifics (user: User, request: RegisterUserRequest): Promise<User> {
    // No hay lógica adicional compleja para el cliente por ahora.
    // El rol ya está asignado en RegisterUserUseCase.
    console.log(`[STRATEGY] User ${user.email} registered as CLIENT.`)
    // Aquí podrías crear un perfil de cliente si existiera.
    return user
  }
}

/**
 * @class ServiceProviderRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo SERVICE_PROVIDER.
 * ⚠️ En una implementación real, esto podría publicar un evento para que Providers Service
 * cree el perfil (p.ej., ProviderProfileCreatedEvent).
 */
export class ServiceProviderRegistrationStrategy extends BaseRegistrationStrategy {
  protected async assignSpecifics (user: User, request: RegisterUserRequest): Promise<User> {
    // Lógica de negocio específica para un proveedor:
    // 1. Inicializar el perfil de proveedor (Entidad o evento de dominio).
    // 2. Establecer el estado inicial (ej. PENDIENTE_VERIFICACION).
    console.log(`[STRATEGY] User ${user.email} registered as SERVICE_PROVIDER.`)
    // user.markAsPendingVerification(); // Si la lógica lo requiere.
    return user
  }
}
