// src/infrastructure/database/repositories/OAuthUserAdapter.ts

import { eq, and } from 'drizzle-orm'
import { type DbClient } from '../drizzle/client'
import { userOAuthProviders } from '../drizzle/schema'
import {
  IOAuthUserRepository,
  CreateOAuthUserRecord,
  OAuthUserRecord,
  UpdateOAuthTokens
} from '../../../domain/repositories/IOAuthUserRepository'
import { injectable, singleton, inject } from 'tsyringe'
import { INJECTION_TOKENS } from '../../DI/InjectionTokens'

/**
 * @class OAuthUserAdapter
 * @description Adaptador que implementa el contrato IOAuthUserRepository (Port)
 * utilizando Drizzle ORM y PostgreSQL (Adapter).
 * Es responsable de mapear registros OAuth de la base de datos a la interfaz del dominio.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
@singleton()
export class OAuthUserAdapter implements IOAuthUserRepository {
  private readonly db: DbClient

  constructor (@inject(INJECTION_TOKENS.DB_CLIENT) db: DbClient) {
    this.db = db
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

    const firstResult = result[0]
    if (firstResult === null || firstResult === undefined) {
      return null
    }

    return this.mapToRecord(firstResult)
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

    const firstResult = result[0]
    if (firstResult === null || firstResult === undefined) {
      return null
    }

    return this.mapToRecord(firstResult)
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

    if (created === null || created === undefined) {
      throw new Error('Failed to create OAuth user record')
    }

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
