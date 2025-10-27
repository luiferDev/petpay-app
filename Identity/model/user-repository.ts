import { db, users, userRoles } from './schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { eq } from 'drizzle-orm'
import { compare } from 'bcrypt'
import { LoginInput } from '../schema/login-schema'
import { logger } from '../lib/logger'
import { ClientUserRegister } from '../template-method/concrete-classes/ClientUserRegister'
import { AdminUserRegister } from '../template-method/concrete-classes/AdminUserRegister'
import { ServiceProviderUserRegister } from '../template-method/concrete-classes/ServiceProviderUserRegister'
import { Role } from '../template-method/register.template'

export class UserRepository {
  private readonly db = db

  /**
     * Registra un nuevo usuario, crea su cuenta asociada y establece los roles iniciales,
     * todo dentro de una única transacción atómica.
     * * @param userData Datos validados del usuario (sin el hash de la contraseña).
     * @param accountData Datos validados para la cuenta inicial.
     * @returns Un objeto que contiene el ID del nuevo usuario y el ID de la cuenta.
     */
  public static async registerClient(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const clientRegister = new ClientUserRegister(db)
    return await clientRegister.registerUser(userData, accountData)
  }

  public static async registerServiceProvider(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const serviceProviderUserRegister = new ServiceProviderUserRegister(db)
    return await serviceProviderUserRegister.registerUser(userData, accountData)
  }

  public static async registerAdmin(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const adminUserRegister = new AdminUserRegister(db)
    return await adminUserRegister.registerUser(userData, accountData)
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
