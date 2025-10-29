import { LoginInput } from '../schema/login-schema'
import { UserRegisterInput, AccountCreateInput } from '../schema/register-schema'

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

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  isVerified: boolean
  role: { UserRole: UserRole }
}

export enum UserRole {
  CLIENT = 'CLIENT',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  ADMIN = 'ADMIN'
}

export interface IUserRepository {
  registerClient(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string, accountId: number }>
  registerServiceProvider(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string, accountId: number }>
  registerAdmin(userData: UserRegisterInput, accountData: AccountCreateInput): Promise<{ userId: string, accountId: number }>
  loginUser(loginData: LoginInput): Promise<{ user: IUser, role: UserRole }>
  getAllUsers(): Promise<{ users: User[] }>
  verifyUser(userId: string): Promise<{ id: string, email: string, isVerified: boolean }>
}