// src/application/ports/IRegistrationStrategy.ts

import { RegisterUserRequest } from '../dtos/RegisterUser.dto';
import { User } from '../../domain/entities/User';

/**
 * @interface IRegistrationStrategy
 * @description Port para la lógica específica de registro por rol.
 * Asegura que todas las estrategias implementen el método para aplicar lógica
 * de negocio que varía según el rol (e.g., crear Account, configurar permisos).
 * * Este Port reemplaza al patrón Template Method, externalizando la abstracción.
 */
export interface IRegistrationStrategy {
    /**
     * Aplica la lógica de negocio específica para un rol dentro de una transacción.
     * @param {User} user - La entidad User base.
     * @param {RegisterUserRequest} request - El request original.
     * @returns {Promise<User>} La entidad User potencialmente modificada o enriquecida.
     */
    applySpecifics(user: User, request: RegisterUserRequest): Promise<User>;
}