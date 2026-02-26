// src/infrastructure/database/repositories/OAuthUserRepository.ts

import { eq, and } from 'drizzle-orm'
import { getDb, DbClient } from '../database/drizzle/client'
import { userOAuthProviders } from '../database/drizzle/schema'
import {
  IOAuthUserRepository,
  CreateOAuthUserRecord,
  OAuthUserRecord,
  UpdateOAuthTokens
} from '../../application/ports/IOAuthUserRepository'

/**
 * @class OAuthUserRepositoryImpl
 * @description Implementación del repositorio de proveedores OAuth usando Drizzle ORM.
 */
export class OAuthUserRepositoryImpl implements IOAuthUserRepository {
  private readonly db: DbClient

  constructor (db?: DbClient) {
    this.db = db ?? getDb()
  }

  async findByProviderAndId (
    provider: 'google' | 'github',
    providerUserId: string
  ): Promise<OAuthUserRecord | null> {
    const result = await this.db
      .select()
      .from(userOAuthProviders)
      .where(
        and(
          eq(userOAuthProviders.provider, provider),
          eq(userOAuthProviders.providerUserId, providerUserId)
        )
      )
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return this.mapToRecord(result[0])
  }

  async findByUserIdAndProvider (
    userId: string,
    provider: 'google' | 'github'
  ): Promise<OAuthUserRecord | null> {
    const result = await this.db
      .select()
      .from(userOAuthProviders)
      .where(
        and(
          eq(userOAuthProviders.userId, userId),
          eq(userOAuthProviders.provider, provider)
        )
      )
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return this.mapToRecord(result[0])
  }

  async findByUserId (userId: string): Promise<OAuthUserRecord[]> {
    const result = await this.db
      .select()
      .from(userOAuthProviders)
      .where(eq(userOAuthProviders.userId, userId))

    return result.map(this.mapToRecord)
  }

  async create (record: CreateOAuthUserRecord): Promise<OAuthUserRecord> {
    const [created] = await this.db
      .insert(userOAuthProviders)
      .values({
        userId: record.userId,
        provider: record.provider,
        providerUserId: record.providerUserId,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        expiresAt: record.expiresAt
      })
      .returning()

    return this.mapToRecord(created)
  }

  async updateTokens (id: string, tokens: UpdateOAuthTokens): Promise<void> {
    await this.db
      .update(userOAuthProviders)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        updatedAt: new Date()
      })
      .where(eq(userOAuthProviders.id, id))
  }

  async delete (id: string): Promise<void> {
    await this.db
      .delete(userOAuthProviders)
      .where(eq(userOAuthProviders.id, id))
  }

  async deleteByUserId (userId: string): Promise<void> {
    await this.db
      .delete(userOAuthProviders)
      .where(eq(userOAuthProviders.userId, userId))
  }

  /**
   * @private
   * @method mapToRecord
   * @description Mapea el resultado de Drizzle a la interfaz OAuthUserRecord.
   */
  private mapToRecord (
    dbRecord: typeof userOAuthProviders.$inferSelect
  ): OAuthUserRecord {
    return {
      id: dbRecord.id,
      userId: dbRecord.userId,
      provider: dbRecord.provider,
      providerUserId: dbRecord.providerUserId,
      accessToken: dbRecord.accessToken ?? undefined,
      refreshToken: dbRecord.refreshToken ?? undefined,
      expiresAt: dbRecord.expiresAt ?? undefined,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt
    }
  }
}
