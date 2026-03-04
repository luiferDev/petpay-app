import { Role } from '../../domain/types/Role'
import { User } from '../../domain/entities/User'
import { IRegistrationStrategy } from '../ports/IRegistrationStrategy'
import { UserResponse } from './UserResponse.dto'

// Re-export for convenience
export { UserResponse }

// ----------------------------------------------------
// DTOs de Request (Usados por el Controller, validados por Zod)
// ----------------------------------------------------

/**
 * @interface RegisterUserRequest
 * @description DTO de entrada para el caso de uso de registro.
 * Contiene todos los campos validados del Request HTTP.
 */
export interface RegisterUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: Role
}

// Alias for RegistrationStrategy (for backwards compatibility)
export type RegistrationStrategy = IRegistrationStrategy
