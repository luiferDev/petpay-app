// src/infrastructure/persistence/user.adapter.ts

import { IUserRepository } from '../../core/domain/ports/user.repository'
import { db, users, accounts, accountUsers, userRoles } from './schemas'
import { UserRegisterInput, AccountCreateInput } from '../web/validations/register.validation'
import { InferInsertModel, eq } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import { hash } from 'bcrypt'
import { SALT_ROUNDS } from '../../../lib/config'

// Tipos para inserción
type InsertUser = InferInsertModel<typeof users>
type InsertAccount = InferInsertModel<typeof accounts>
type InsertAccountUser = InferInsertModel<typeof accountUsers>
type InsertUserRole = InferInsertModel<typeof userRoles>

export class DrizzleUserRepository implements IUserRepository {
  // Implementación del método requerido por el Puerto
  public async registerUserWithAccount (
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    // 1. Hashear la contraseña
    const passwordHashed = await hash(userData.passwordHash, SALT_ROUNDS)
    const idUUID = crypto.randomUUID()
    const userToInsert: InsertUser = {
      id: idUUID,
      email: userData.email,
      passwordHash: passwordHashed,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone ?? null
    }

    return await db.transaction(async (tx: PgTransaction<any, any, any>) => {
      // I. CREAR EL USUARIO
      const [newUser] = await tx.insert(users).values(userToInsert).returning({ id: users.id })
      if (newUser == null) throw new Error('Failed to create user')

      // II. CREAR LA CUENTA
      const accountToInsert: InsertAccount = {
        accountName: accountData.accountName,
        type: accountData.type
      }
      const [newAccount] = await tx.insert(accounts).values(accountToInsert).returning({ id: accounts.id })
      if (newAccount == null) throw new Error('Failed to create account')

      // III. ASIGNAR ROL DE PROPIETARIO
      const accountUserToInsert: InsertAccountUser = {
        userId: newUser.id,
        accountId: newAccount.id,
        permissionLevel: 'OWNER'
      }
      await tx.insert(accountUsers).values(accountUserToInsert)

      // IV. ASIGNAR ROL GLOBAL
      const userRoleToInsert: InsertUserRole = {
        userId: newUser.id,
        role: 'CLIENT'
      }
      await tx.insert(userRoles).values(userRoleToInsert)

      return { userId: newUser.id, accountId: newAccount.id }
    })
  }

  // Implementación del método findByEmail
  public async findByEmail (email: string): Promise<any | null> {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return user.length > 0 ? user[0] : null
  }
}
