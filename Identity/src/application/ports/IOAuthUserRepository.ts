/**
 * @interface CreateOAuthUserRecord
 * @description Datos necesarios para crear un registro de proveedor OAuth.
 */
export interface CreateOAuthUserRecord {
  userId: string
  provider: 'google' | 'github'
  providerUserId: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
}

/**
 * @interface OAuthUserRecord
 * @description Registro de proveedor OAuth en la base de datos.
 */
export interface OAuthUserRecord {
  id: string
  userId: string
  provider: 'google' | 'github'
  providerUserId: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * @interface UpdateOAuthTokens
 * @description Datos para actualizar los tokens de OAuth.
 */
export interface UpdateOAuthTokens {
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
}

/**
 * @interface IOAuthUserRepository
 * @description Contrato para el repositorio de proveedores OAuth.
 * Implementado por la capa de Infraestructura.
 */
export interface IOAuthUserRepository {
  /**
   * Busca un proveedor OAuth por el ID del proveedor y el ID del usuario en dicho proveedor.
   * @param {string} provider - Proveedor OAuth (google | github)
   * @param {string} providerUserId - ID del usuario en el proveedor
   * @returns {Promise<OAuthUserRecord | null>} Registro encontrado o null
   */
  findByProviderAndId: (provider: 'google' | 'github', providerUserId: string) => Promise<OAuthUserRecord | null>

  /**
   * Busca un proveedor OAuth asociado a un usuario.
   * @param {string} userId - ID del usuario
   * @param {string} provider - Proveedor OAuth
   * @returns {Promise<OAuthUserRecord | null>} Registro encontrado o null
   */
  findByUserIdAndProvider: (userId: string, provider: 'google' | 'github') => Promise<OAuthUserRecord | null>

  /**
   * Busca todos los proveedores OAuth de un usuario.
   * @param {string} userId - ID del usuario
   * @returns {Promise<OAuthUserRecord[]>} Lista de proveedores
   */
  findByUserId: (userId: string) => Promise<OAuthUserRecord[]>

  /**
   * Crea un nuevo registro de proveedor OAuth.
   * @param {CreateOAuthUserRecord} record - Datos del registro
   * @returns {Promise<OAuthUserRecord>} Registro creado
   */
  create: (record: CreateOAuthUserRecord) => Promise<OAuthUserRecord>

  /**
   * Actualiza los tokens de un proveedor OAuth.
   * @param {string} id - ID del registro
   * @param {UpdateOAuthTokens} tokens - Nuevos tokens
   * @returns {Promise<void>}
   */
  updateTokens: (id: string, tokens: UpdateOAuthTokens) => Promise<void>

  /**
   * Elimina un registro de proveedor OAuth.
   * @param {string} id - ID del registro
   * @returns {Promise<void>}
   */
  delete: (id: string) => Promise<void>

  /**
   * Elimina todos los proveedores OAuth de un usuario.
   * @param {string} userId - ID del usuario
   * @returns {Promise<void>}
   */
  deleteByUserId: (userId: string) => Promise<void>
}
