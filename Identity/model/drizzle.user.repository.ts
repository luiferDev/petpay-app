import { Db, users, userRoles } from './schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { eq } from 'drizzle-orm'
import { compare } from 'bcrypt'
import { LoginInput } from '../schema/login-schema'
import { logger } from '../lib/logger'
import { ClientUserRegister } from '../template-method/concrete-classes/ClientUserRegister'
import { AdminUserRegister } from '../template-method/concrete-classes/AdminUserRegister'
import { ServiceProviderUserRegister } from '../template-method/concrete-classes/ServiceProviderUserRegister'
import { Role } from '../template-method/register.template'
import { IUser, IUserRepository, User, UserRole } from '../interfaces/IUserRepository'
import { role } from '../generated/prisma/enums'


export class DrizzleUserRepository implements IUserRepository {
  drizzle = Db

  constructor (database?: typeof Db) {
    if (database != null) {
      this.drizzle = database
    }
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
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const clientRegister = new ClientUserRegister(this.drizzle)
    return await clientRegister.registerUser(userData, accountData)
  }

  public async registerServiceProvider(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const serviceProviderUserRegister = new ServiceProviderUserRegister(this.drizzle)
    return await serviceProviderUserRegister.registerUser(userData, accountData)
  }

  public async registerAdmin(
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ): Promise<{ userId: string, accountId: number, role: Role }> {
    const adminUserRegister = new AdminUserRegister(this.drizzle)
    return await adminUserRegister.registerUser(userData, accountData)
  }

  public async loginUser({ email, passwordHash }: LoginInput): Promise<{ user: IUser, role: UserRole }> {
    logger.info('Buscando usuario', { email })
    const [userWithRole] = await this.drizzle.select({
      user: users,
      role: userRoles.role
    }).from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .where(eq(users.email, email))

    const user = userWithRole?.user
    const role = userWithRole?.role

    if (user == null) {
      logger.warn('Usuario no encontrado', { email })
      const allUsers = await this.drizzle.select({ email: users.email }).from(users)
      logger.debug('Usuarios en la base de datos', { count: allUsers.length })
      throw new Error('Usuario no existe')
    }
    if (!role || !(role in UserRole)) {
      logger.warn('Rol no asignado o inválido al usuario', { email, role })
      throw new Error('Rol de usuario no asignado')
    }

    logger.info('Usuario encontrado, verificando contraseña')
    const isValidPassword = await compare(passwordHash, user.passwordHash)

    if (!isValidPassword) {
      logger.warn('Contraseña incorrecta', { email })
      throw new Error('Contraseña incorrecta')
    }

    logger.info('Login exitoso', { userEmail: user.email })
    return { user, role: UserRole[role] }
  }

  public async getAllUsers(): Promise<{ users: User[] }> {
    const usersData = await this.drizzle.select({ 
      id: users.id, 
      email: users.email, 
      firstName: users.firstName, 
      lastName: users.lastName, 
      isVerified: users.isVerified,
      role: userRoles.role
    }).from(users).rightJoin(userRoles, eq(users.id, userRoles.userId))

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

  public async verifyUser(userId: string): Promise<{ id: string, email: string, isVerified: boolean }> {
    const [updatedUser] = await Db.update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, isVerified: users.isVerified })

    if (updatedUser == null) {
      throw new Error('Usuario no encontrado')
    }

    return updatedUser
  }
}
