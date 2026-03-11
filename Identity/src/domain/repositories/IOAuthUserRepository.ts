/**
 * @class CreateOAuthUserRecord
 * @description Convertido a clase para evitar errores de exportación en Bun.
 */
export class CreateOAuthUserRecord {
  userId!: string
  provider!: 'google' | 'github'
  providerUserId!: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
}

/**
 * @class OAuthUserRecord
 */
export class OAuthUserRecord {
  id!: string
  userId!: string
  provider!: 'google' | 'github'
  providerUserId!: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  createdAt!: Date
  updatedAt!: Date
}

/**
 * @class UpdateOAuthTokens
 */
export class UpdateOAuthTokens {
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
}

/**
 * @class IOAuthUserRepository
 * @description Port (Clase Abstracta) para persistencia OAuth.
 */
export abstract class IOAuthUserRepository {
  abstract findByProviderAndId (provider: 'google' | 'github', providerUserId: string): Promise<OAuthUserRecord | null>
  abstract findByUserIdAndProvider (userId: string, provider: 'google' | 'github'): Promise<OAuthUserRecord | null>
  abstract findByUserId (userId: string): Promise<OAuthUserRecord[]>
  abstract create (record: CreateOAuthUserRecord): Promise<OAuthUserRecord>
  abstract updateTokens (id: string, tokens: UpdateOAuthTokens): Promise<void>
  abstract delete (id: string): Promise<void>
  abstract deleteByUserId (userId: string): Promise<void>
}
