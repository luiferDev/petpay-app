// src/application/strategies/registration/AdminRegistrationStrategy.ts

import { BaseRegistrationStrategy } from './UserRegisterStrategy'
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto'
import { User } from '../../../domain/entities/User'

/**
 * @class AdminRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo ADMIN.
 * * La lógica específica del rol (asignación de Account, etc.) se gestiona en
 * la clase base (BaseRegistrationStrategy), que utiliza Ports como IAccountRepository.
 * Esta clase se enfoca en la lógica de negocio *exclusiva* para un Admin.
 * * @augments BaseRegistrationStrategy
 * @author Petpay Architecture Team
 * @version 1.0
 * @since 2025-01-01
 */
export class AdminRegistrationStrategy extends BaseRegistrationStrategy {
  /**
     * @inheritdoc
     * @description Aplica la lógica de negocio específica para un administrador.
     * * @param {User} user - El Aggregate Root User recién creado.
     * @param {RegisterUserRequest} request - El request original.
     * @returns {Promise<User>} La entidad User.
     */
  protected async assignSpecifics (user: User, request: RegisterUserRequest): Promise<User> {
    // Logica de Negocio:
    // 1. Un Admin siempre tiene el rol 'ADMIN' (ya establecido en el Use Case).
    // 2. La cuenta ha sido creada por BaseRegistrationStrategy.
    // 3. Lógica específica podría ir aquí:
    //    - Enviar notificación a Super-Administrador.
    //    - Inicializar configuraciones de plataforma por defecto.

    // Por ahora, solo logueamos la acción específica para fines de auditoría.
    console.log(`[STRATEGY] User ${user.email} registered as ADMIN. No additional specifics required at this stage.`)

    return user
  }
}
