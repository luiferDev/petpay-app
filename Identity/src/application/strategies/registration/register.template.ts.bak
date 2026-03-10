import { ExtractTablesWithRelations, InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { Db, accounts, accountUsers, userRoles, users } from '../model/schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { SALT_ROUNDS } from '../lib/config'
import { hash } from 'bcrypt'
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import { PgTransaction } from 'drizzle-orm/pg-core'

// Tipos de Drizzle
type InsertUser = InferInsertModel<typeof users>
// type SelectUser = InferSelectModel<typeof users>
// type SelectUserRole = InferSelectModel<typeof userRoles>
type InsertAccount = InferInsertModel<typeof accounts>
type InsertAccountUser = InferInsertModel<typeof accountUsers>
export type InsertUserRole = InferInsertModel<typeof userRoles>

export type TX = PgTransaction<NodePgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>

export enum Role { // Renombramos para usar mayúscula y ser consistentes con la convención
  ADMIN = 'ADMIN',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  CLIENT = 'CLIENT'
}

export abstract class UserRegisterTemplate {
  protected db: typeof Db

  constructor (database: typeof Db) {
    this.db = database
  }

  // Template Method - define el algoritmo
  public async registerUser (
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const userToInsert = await this.prepareUserData(userData)

    return await this.db.transaction(async (tx) => {
      const newUser = await this.createUser(tx, userToInsert)
      const newAccount = await this.createAccount(tx, accountData)
      await this.assignAccountRole(tx, newUser.id, newAccount.id)
      const role: Role = await this.assignGlobalRole(tx, newUser.id)

      return {
        userId: newUser.id,
        accountId: newAccount.id,
        role
      }
    })
  }

  // Métodos abstractos que deben implementar las subclases
  protected abstract assignGlobalRole (tx: TX, userId: string): Promise<Role>

  // Métodos concretos con implementación por defecto
  protected async prepareUserData (userData: UserRegisterInput): Promise<InsertUser> {
    const id = crypto.randomUUID()
    const passwordHash = await hash(userData.passwordHash, SALT_ROUNDS)

    return {
      id,
      email: userData.email,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone ?? null,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  protected async createUser (tx: TX, userToInsert: InsertUser) {
    const [newUser] = await tx.insert(users).values(userToInsert).returning({ id: users.id })
    if (newUser == null) throw new Error('Fallo al crear el usuario.')
    return newUser
  }

  protected async createAccount (tx: TX, accountData: AccountCreateInput) {
    const accountToInsert: InsertAccount = {
      accountName: accountData.accountName,
      type: accountData.type
    }
    const [newAccount] = await tx.insert(accounts).values(accountToInsert).returning({ id: accounts.id })
    if (newAccount == null) throw new Error('Fallo al crear la cuenta.')
    return newAccount
  }

  protected async assignAccountRole (tx: TX, userId: string, accountId: number) {
    const accountUserToInsert: InsertAccountUser = {
      userId,
      accountId,
      permissionLevel: 'OWNER'
    }
    await tx.insert(accountUsers).values(accountUserToInsert)
  }
}
