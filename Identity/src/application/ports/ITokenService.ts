import { User } from '../../domain/entities/User'
import { Role } from '../../domain/types/Role'

/**
 * @interface ITokenProvider
 * @description Contrato para la generación y gestión de tokens de autenticación (JWT).
 * Implementado por la capa de Infraestructura (e.g., JwtTokenService).
 */
export interface ITokenProvider {
  /**
   * Genera un par de tokens (Access y Refresh) para un usuario.
   * @param {User} user - Entidad User para incluir en el payload.
   * @returns {{accessToken: string, refreshToken: string}}
   */
  generateTokens: (user: User) => { accessToken: string, refreshToken: string }

  /**
   * Genera un par de tokens para un usuario OAuth (sin necesidad de entidad User completa).
   * @param {string} userId - ID del usuario.
   * @param {string} email - Email del usuario.
   * @param {Role} role - Rol del usuario.
   * @returns {{accessToken: string, refreshToken: string}}
   */
  generateTokensForOAuthUser: (userId: string, email: string, role: Role) => { accessToken: string, refreshToken: string }

  /**
   * Verifica la validez de un token de acceso.
   * @param {string} token - Token a verificar.
   * @returns {any} Payload decodificado si es válido.
   * @throws {Error} Si el token es inválido o expirado.
   */
  verifyToken: (token: string) => any
}
