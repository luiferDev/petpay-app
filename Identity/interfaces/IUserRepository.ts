import { LoginInput } from '../schema/login-schema'
import { UserRegisterInput, AccountCreateInput } from '../schema/register-schema'
import { Role } from '../template-method/register.template'

export interface IUser {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string | null
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IUserRole {
  userId: string
  role: Role
}

export interface IUserRepository {
  registerClient(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string, accountId: number }>
  registerServiceProvider(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string, accountId: number }>
  registerAdmin(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string, accountId: number }>
  loginUser(loginData: LoginInput): Promise<{ user: IUser, role: IUserRole | null }>
  getAllUsers(): Promise<Pick<IUser, 'id' | 'email'>[]>
  verifyUser(userId: string): Promise<IUser>
}