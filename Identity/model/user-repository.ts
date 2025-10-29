import { users, userRoles } from './schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { eq } from 'drizzle-orm'
import { compare } from 'bcrypt'
import { LoginInput } from '../schema/login-schema'
import { logger } from '../lib/logger'
import { ClientUserRegister } from '../template-method/concrete-classes/ClientUserRegister'
import { AdminUserRegister } from '../template-method/concrete-classes/AdminUserRegister'
import { ServiceProviderUserRegister } from '../template-method/concrete-classes/ServiceProviderUserRegister'
import { IUserRepository, IUser, UserRole, User } from '../interfaces/IUserRepository'
import { Db } from './schema'

export class UserRepository implements IUserRepository {
  drizzle = Db
  constructor(database: typeof Db) {
    this.drizzle = database
  }

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
    const clientRegister = new ClientUserRegister(this.drizzle)
    const result = await clientRegister.registerUser(userData, accountData)
    return { userId: result.userId, accountId: result.accountId }
  }

  public async registerServiceProvider(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    const serviceProviderUserRegister = new ServiceProviderUserRegister(this.drizzle)
    const result = await serviceProviderUserRegister.registerUser(userData, accountData)
    return { userId: result.userId, accountId: result.accountId }
  }

  public async registerAdmin(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number }> {
    const adminUserRegister = new AdminUserRegister(this.drizzle)
    const result = await adminUserRegister.registerUser(userData, accountData)
    return { userId: result.userId, accountId: result.accountId }
  }

  public async loginUser({ email, passwordHash }: LoginInput): Promise<{ user: IUser, role: UserRole }> {
    logger.info('Buscando usuario', { email })
    const [user] = await this.drizzle.select().from(users)
      .where(eq(users.email, email))
    const [userRole] = await this.drizzle.select().from(users)
      .rightJoin(userRoles, eq(users.id, userRoles.userId))
      .where(eq(users.email, email))

    const role = userRole?.user_roles.role

    if (!user) {
      logger.warn('Usuario no encontrado', { email })
      const allUsers = await this.drizzle.select({ email: users.email }).from(users)
      logger.debug('Usuarios en la base de datos', { count: allUsers.length })
      throw new Error('Usuario no existe')
    }

    if (role == null || !(role in UserRole)) {
      logger.warn('Usuario sin rol asignado o inválido', { userId: user.id, role })
      throw new Error('Usuario sin rol asignado')
    }

    logger.info('Usuario encontrado, verificando contraseña')
    const isValidPassword = await compare(passwordHash, user.passwordHash)

    if (!isValidPassword) {
      logger.warn('Contraseña incorrecta', { email })
      throw new Error('Contraseña incorrecta')
    }

    logger.info('Login exitoso', { userId: user.id })
    return { user: user, role: UserRole[role] }
  }

  public async getAllUsers(): Promise<{ users: User[] }> {
    logger.info('Obteniendo todos los usuarios')
    const usersData = await this.drizzle.select({ 
      id: users.id, 
      email: users.email, 
      firstName: users.firstName, 
      lastName: users.lastName, 
      isVerified: users.isVerified,
      role: userRoles.role
    }).from(users).leftJoin(userRoles, eq(users.id, userRoles.userId))

    const mappedUsers: User[] = usersData.map(user => ({
      id: user.id!,
      email: user.email!,
      firstName: user.firstName!,
      lastName: user.lastName!,
      isVerified: user.isVerified!,
      role: { UserRole: UserRole[user.role!] }
    }))

    return { users: mappedUsers }
  }

  public async verifyUser(userId: string): Promise<IUser> {
    const [updatedUser] = await this.drizzle.update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      throw new Error('Usuario no encontrado')
    }

    return updatedUser as IUser
  }
}
