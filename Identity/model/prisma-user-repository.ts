import { IUserRepository, IUser, UserRole, User } from '../interfaces/IUserRepository'
import { hash } from 'bcrypt'
import { SALT_ROUNDS } from '../lib/config'
import { generateULID } from '../lib/ulid'
import { LoginInput } from '../schema/login-schema'
import { AccountCreateInput, UserRegisterInput } from '../schema/register-schema'
import { Role } from '../template-method/register.template'

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: any) { }

  private mapUserModel(u: any): IUser {
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.password_hash,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone ?? null,
      isVerified: !!u.is_verified,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }
  }

  public async registerClient(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string; accountId: number }> {
    const id = generateULID()
    const passwordHash = await hash(userData.passwordHash, Number(SALT_ROUNDS) || 10)

    const result = await this.prisma.$transaction(async (tx: any) => {
      const newUser = await tx.users.create({
        data: {
          id,
          email: userData.email,
          password_hash: passwordHash,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone ?? null,
          is_verified: false
        }
      })

      const newAccount = await tx.accounts.create({
        data: {
          account_name: accountData.accountName,
          account_type: accountData.type
        }
      })

      await tx.account_users.create({
        data: {
          account_id: newAccount.id,
          user_id: newUser.id,
          permission_level: 'OWNER'
        }
      })

      await tx.user_roles.create({
        data: {
          user_id: newUser.id,
          role: 'CLIENT'
        }
      })

      return { userId: newUser.id, accountId: newAccount.id }
    })

    return result
  }

  public async registerServiceProvider(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string; accountId: number }> {
    // Same flow but role SERVICE_PROVIDER
    const id = generateULID()
    const passwordHash = await hash(userData.passwordHash, Number(SALT_ROUNDS) || 10)

    const result = await this.prisma.$transaction(async (tx: any) => {
      const newUser = await tx.users.create({
        data: {
          id,
          email: userData.email,
          password_hash: passwordHash,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone ?? null,
          is_verified: false
        }
      })

      const newAccount = await tx.accounts.create({
        data: {
          account_name: accountData.accountName,
          account_type: accountData.type
        }
      })

      await tx.account_users.create({
        data: {
          account_id: newAccount.id,
          user_id: newUser.id,
          permission_level: 'OWNER'
        }
      })

      await tx.user_roles.create({
        data: {
          user_id: newUser.id,
          role: 'SERVICE_PROVIDER'
        }
      })

      return { userId: newUser.id, accountId: newAccount.id }
    })

    return result
  }

  public async registerAdmin(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string; accountId: number }> {
    const id = generateULID()
    const passwordHash = await hash(userData.passwordHash, Number(SALT_ROUNDS) || 10)

    const result = await this.prisma.$transaction(async (tx: any) => {
      const newUser = await tx.users.create({
        data: {
          id,
          email: userData.email,
          password_hash: passwordHash,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone ?? null,
          is_verified: false
        }
      })

      const newAccount = await tx.accounts.create({
        data: {
          account_name: accountData.accountName,
          account_type: accountData.type
        }
      })

      await tx.account_users.create({
        data: {
          account_id: newAccount.id,
          user_id: newUser.id,
          permission_level: 'OWNER'
        }
      })

      await tx.user_roles.create({
        data: {
          user_id: newUser.id,
          role: 'ADMIN'
        }
      })

      return { userId: newUser.id, accountId: newAccount.id }
    })

    return result
  }

  public async loginUser({ email, passwordHash }: LoginInput): Promise<{ user: IUser; role: UserRole }> {
    const user = await this.prisma.users.findUnique({ where: { email } })
    if (!user) throw new Error('Usuario no existe')

    const roles = await this.prisma.user_roles.findMany({ where: { user_id: user.id } })
    if (roles.length === 0) throw new Error('Usuario sin rol asignado')
    
    const role = roles[0].role as string
    if (!(role in UserRole)) throw new Error('Rol inválido')

    const { compare } = await import('bcrypt')
    const isValidPassword = await compare(passwordHash, user.password_hash)
    if (!isValidPassword) throw new Error('Contraseña incorrecta')

    return { user: this.mapUserModel(user), role: UserRole[role as keyof typeof UserRole] }
  }

  public async getAllUsers(): Promise<{ users: User[] }> {
    const usersData = await this.prisma.users.findMany({ 
      select: { 
        id: true, 
        email: true, 
        first_name: true, 
        last_name: true, 
        is_verified: true 
      },
      include: {
        user_roles: { select: { role: true } }
      }
    })
    
    const users: User[] = usersData.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      isVerified: u.is_verified,
      role: { UserRole: UserRole[u.user_roles[0]?.role as keyof typeof UserRole] || UserRole.CLIENT }
    }))
    
    return { users }
  }

  public async verifyUser(userId: string): Promise<IUser> {
    const updatedUser = await this.prisma.users.update({ where: { id: userId }, data: { is_verified: true, updated_at: new Date() } })
    if (!updatedUser) throw new Error('Usuario no encontrado')
    return this.mapUserModel(updatedUser)
  }
}
