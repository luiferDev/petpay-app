import { Role } from '../../domain/types/Role'

/**
 * @interface UserResponse
 * @description DTO (Data Transfer Object) de salida estandarizado.
 * Contiene los datos públicos del usuario que se exponen a la capa de presentación (Controller)
 * después de operaciones como registro, login, o consulta de perfil.
 * * * ⚠️ Principio: Nunca debe exponer datos sensibles como passwordHash.
 */
export interface UserResponse {
  /**
   * ID único del usuario.
   */
  id: string

  /**
   * Correo electrónico del usuario.
   */
  email: string

  /**
   * Nombre completo concatenado (para display en UI).
   */
  fullName: string

  /**
   * Lista de roles asignados.
   */
  roles: Role[]

  /**
   * Estado de verificación de la cuenta.
   */
  isVerified: boolean

  // Se pueden agregar otros campos públicos si son necesarios, ej. phone, avatarUrl.
}
