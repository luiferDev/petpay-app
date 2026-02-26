/**
 * @interface OAuthUserProfile
 * @description Perfil de usuario obtenido del proveedor OAuth.
 */
export interface OAuthUserProfile {
  /** Proveedor OAuth (google | github) */
  provider: 'google' | 'github'
  /** ID del usuario en el proveedor */
  providerId: string
  /** Email del usuario (verificado por el proveedor) */
  email: string
  /** Nombre para mostrar */
  displayName?: string
  /** URL del avatar */
  avatarUrl?: string
}

/**
 * @interface OAuthTokens
 * @description Tokens obtenidos del proveedor OAuth.
 */
export interface OAuthTokens {
  /** Token de acceso */
  accessToken: string
  /** Token de refresco (opcional) */
  refreshToken?: string
  /** Tiempo de expiración en segundos */
  expiresIn?: number
}

/**
 * @interface IOAuthProvider
 * @description Contrato para implementaciones de proveedores OAuth.
 * Implementado por la capa de Infraestructura.
 */
export interface IOAuthProvider {
  /** Nombre del proveedor OAuth */
  readonly providerName: 'google' | 'github'

  /**
   * Genera la URL de autorización para iniciar el flujo OAuth.
   * @param {string} state - Parámetro state para CSRF protection.
   * @returns {string} URL de autorización.
   */
  getAuthorizationUrl: (state: string) => string

  /**
   * Intercambia el código de autorización por tokens.
   * @param {string} code - Código de autorización del callback.
   * @returns {Promise<OAuthTokens>} Tokens de acceso.
   */
  exchangeCodeForTokens: (code: string) => Promise<OAuthTokens>

  /**
   * Obtiene el perfil del usuario del proveedor OAuth.
   * @param {string} accessToken - Token de acceso válido.
   * @returns {Promise<OAuthUserProfile>} Perfil del usuario.
   */
  getUserProfile: (accessToken: string) => Promise<OAuthUserProfile>
}
