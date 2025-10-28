import { users, userRoles } from './schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { eq } from 'drizzle-orm'
import { compare } from 'bcrypt'
import { LoginInput } from '../schema/login-schema'
import { logger } from '../lib/logger'
import { ClientUserRegister } from '../template-method/concrete-classes/ClientUserRegister'
import { AdminUserRegister } from '../template-method/concrete-classes/AdminUserRegister'
import { ServiceProviderUserRegister } from '../template-method/concrete-classes/ServiceProviderUserRegister'
import { Role } from '../template-method/register.template'
import { IUserRepository, IUser, IUserRole } from '../interfaces/IUserRepository'

export class UserRepository implements IUserRepository {
  constructor(private readonly db: any) { }

  /**
     * Registra un nuevo usuario, crea su cuenta asociada y establece los roles iniciales,
     * todo dentro de una única transacción atómica.
     * * @param userData Datos validados del usuario (sin el hash de la contraseña).
     * @param accountData Datos validados para la cuenta inicial.
     * @returns Un objeto que contiene el ID del nuevo usuario y el ID de la cuenta.
     */
  public async registerClient(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    const clientRegister = new ClientUserRegister(this.db)
    const result = await clientRegister.registerUser(userData, accountData)
    return { userId: result.userId, accountId: result.accountId }
  }

  public async registerServiceProvider(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    const serviceProviderUserRegister = new ServiceProviderUserRegister(this.db)
    const result = await serviceProviderUserRegister.registerUser(userData, accountData)
    return { userId: result.userId, accountId: result.accountId }
  }

  public async registerAdmin(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    const adminUserRegister = new AdminUserRegister(this.db)
    const result = await adminUserRegister.registerUser(userData, accountData)
    return { userId: result.userId, accountId: result.accountId }
  }

  public async loginUser({ email, passwordHash }: LoginInput): Promise<{ user: IUser, role: IUserRole | null }> {
    logger.info('Buscando usuario', { email })
    const [user] = await this.db.select().from(users)
      .where(eq(users.email, email))
    const [role] = await this.db.select({ userId: userRoles.userId, role: userRoles.role }).from(users)
      .rightJoin(userRoles, eq(users.id, userRoles.userId))
      .where(eq(users.email, email))

    if (!user) {
      logger.warn('Usuario no encontrado', { email })
      const allUsers = await this.db.select({ email: users.email }).from(users)
      logger.debug('Usuarios en la base de datos', { count: allUsers.length })
      throw new Error('Usuario no existe')
    }

    if (!role) {
      logger.warn('Usuario sin rol asignado', { userId: user.id })
    }

    logger.info('Usuario encontrado, verificando contraseña')
    const isValidPassword = await compare(passwordHash, user.passwordHash)

    if (!isValidPassword) {
      logger.warn('Contraseña incorrecta', { email })
      throw new Error('Contraseña incorrecta')
    }

    logger.info('Login exitoso', { userId: user.id })
    return { user: user as IUser, role: role ? { userId: role.userId, role: role.role as Role } : null }
  }

  public async getAllUsers(): Promise<Pick<IUser, 'id' | 'email'>[]> {
    return await this.db.select({ id: users.id, email: users.email }).from(users)
  }

  public async verifyUser(userId: string): Promise<IUser> {
    const [updatedUser] = await this.db.update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      throw new Error('Usuario no encontrado')
    }

    return updatedUser as IUser
  }
}
