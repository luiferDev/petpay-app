import { db, users, accounts, accountUsers, userRoles } from './schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { InferInsertModel, InferSelectModel, eq } from 'drizzle-orm'
import { compare, hash } from 'bcrypt'
import { SALT_ROUNDS } from '../lib/config'
import { LoginInput } from '../schema/login-schema'
import { logger } from '../lib/logger'

// Tipos de Drizzle
type InsertUser = InferInsertModel<typeof users>
type SelectUser = InferSelectModel<typeof users>
type SelectUserRole = InferSelectModel<typeof userRoles>
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
  public static async registerUser(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: string }> {
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
        accountId: newAccount.id,
        role: userRoleToInsert.role
      }
    })
  }

  public static async loginUser({ email, passwordHash }: LoginInput) {
    logger.info('Buscando usuario', { email })
    const [user] = await db.select().from(users)
      .where(eq(users.email, email))
    const [role] = await db.select({ role: userRoles.role }).from(users)
      .rightJoin(userRoles, eq(users.id, userRoles.userId))

    if (!user) {
      logger.warn('Usuario no encontrado', { email })
      const allUsers = await db.select({ email: users.email }).from(users)
      logger.debug('Usuarios en la base de datos', { count: allUsers.length })
      throw new Error('Usuario no existe')
    }

    logger.info('Usuario encontrado, verificando contraseña')
    const isValidPassword = await compare(passwordHash, user.passwordHash)

    if (!isValidPassword) {
      logger.warn('Contraseña incorrecta', { email })
      throw new Error('Contraseña incorrecta')
    }

    logger.info('Login exitoso', { userId: user.id })
    return { user, role }
  }

  public static async getAllUsers() {
    return await db.select({ id: users.id, email: users.email }).from(users)
  }

  public static async verifyUser(userId: string) {
    const [updatedUser] = await db.update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, isVerified: users.isVerified })

    if (!updatedUser) {
      throw new Error('Usuario no encontrado')
    }

    return updatedUser
  }
}
