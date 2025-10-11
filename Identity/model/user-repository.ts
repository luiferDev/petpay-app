import { db, users, accounts, accountUsers, userRoles } from './schema' // Importa todas las tablas necesarias
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema' // Tipos de Zod
import { InferInsertModel } from 'drizzle-orm'
import { hash } from 'bcrypt'
import { SALT_ROUNDS } from '../lib/config'

// Infiere los tipos de inserción de Drizzle para las tablas principales
type InsertUser = InferInsertModel<typeof users>
type InsertAccount = InferInsertModel<typeof accounts>
type InsertAccountUser = InferInsertModel<typeof accountUsers>
type InsertUserRole = InferInsertModel<typeof userRoles>

export class UserRepository {
  private readonly db = db

  /**
     * Registra un nuevo usuario, crea su cuenta asociada y establece los roles iniciales,
     * todo dentro de una única transacción atómica.
     * * @param userData Datos validados del usuario (sin el hash de la contraseña).
     * @param accountData Datos validados para la cuenta inicial.
     * @returns Un objeto que contiene el ID del nuevo usuario y el ID de la cuenta.
     */
  public static async registerUser (
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    // 1. Hashear la contraseña
    const id = crypto.randomUUID()
    const passwordHash = await hash(userData.passwordHash, SALT_ROUNDS)

    // 2. Preparar el objeto para la inserción en la tabla 'users'
    const userToInsert: InsertUser = {
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

    // 3. Iniciar Transacción Atómica
    return await db.transaction(async (tx) => {
      // I. CREAR EL USUARIO
      const [newUser] = await tx.insert(users).values(userToInsert).returning({ id: users.id })
      if (newUser == null) throw new Error('Fallo al crear el usuario.')

      // II. CREAR LA CUENTA
      const accountToInsert: InsertAccount = {
        accountName: accountData.accountName,
        type: accountData.type
      }
      const [newAccount] = await tx.insert(accounts).values(accountToInsert).returning({ id: accounts.id })
      if (newAccount == null) throw new Error('Fallo al crear la cuenta.')

      // III. ASIGNAR ROL DE PROPIETARIO (accountUsers)
      const accountUserToInsert: InsertAccountUser = {
        userId: newUser.id,
        accountId: newAccount.id,
        permissionLevel: 'OWNER' // Rol inicial de la cuenta
      }
      await tx.insert(accountUsers).values(accountUserToInsert)

      // IV. ASIGNAR ROL GLOBAL (userRoles)
      const userRoleToInsert: InsertUserRole = {
        userId: newUser.id,
        role: 'CLIENT' // Rol de nivel de sistema por defecto
      }
      await tx.insert(userRoles).values(userRoleToInsert)

      // Retornar IDs si todas las operaciones fueron exitosas
      return {
        userId: newUser.id,
        accountId: newAccount.id
      }
    })
  }
}
