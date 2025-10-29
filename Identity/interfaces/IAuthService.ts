import { z } from 'zod'
import { Role } from '../template-method/register.template'
import { User } from './IUserRepository'

export interface IAuthResponse {
  status: number
  message: string
  data?: any
  errors?: z.ZodError
  token?: string
}

export interface IAuthService {
  registerClient(requestBody: Request): Promise<IAuthResponse>
  registerServiceProvider(requestBody: Request, role: Role.SERVICE_PROVIDER): Promise<IAuthResponse>
  registerAdmin(requestBody: Request, role: Role.ADMIN): Promise<IAuthResponse>
  login(requestBody: Request): Promise<IAuthResponse>
  listUsers(): Promise<{ users: User[] }>
  verifyEmail(userId: string): Promise<IAuthResponse>
}