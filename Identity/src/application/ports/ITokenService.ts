import { User } from '../../domain/entities/User'
import { Role } from '../../domain/types/Role'

/**
 * @class ITokenService
 * @description Contrato abstracto para la gestión de tokens.
 * Se utiliza una clase abstracta para asegurar la persistencia del token en runtime con Bun.
 */
export abstract class ITokenService {
  /**
   * Genera un par de tokens (Access y Refresh) para un usuario.
   * @param {User} user - Entidad User para incluir en el payload.
   * @returns {{accessToken: string, refreshToken: string}}
   */
  abstract generateTokens (user: User): { accessToken: string, refreshToken: string }

  /**
   * Genera un par de tokens para un usuario OAuth.
   * @param {string} userId - ID del usuario.
   * @param {string} email - Email del usuario.
   * @param {Role} role - Rol del usuario.
   * @returns {{accessToken: string, refreshToken: string}}
   */
  abstract generateTokensForOAuthUser (userId: string, email: string, role: Role): { accessToken: string, refreshToken: string }

  /**
   * Verifica la validez de un token de acceso.
   * @param {string} token - Token a verificar.
   * @returns {any} Payload decodificado si es válido.
   */
  abstract verifyToken (token: string): any

  /**
   * Genera un token de verificación de email.
   * @param {string} userId - ID del usuario.
   * @param {string} email - Email del usuario.
   * @returns {string} Token de verificación.
   */
  abstract generateVerificationToken (userId: string, email: string): string
}
