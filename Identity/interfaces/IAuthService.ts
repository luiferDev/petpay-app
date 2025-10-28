import { z } from 'zod'
import { Role } from '../template-method/register.template'

export interface IAuthResponse {
  status: number
  message: string
  data?: any
  errors?: z.ZodError
  token?: string
}

export interface IAuthService {
  registerClient(requestBody: unknown): Promise<IAuthResponse>
  registerServiceProvider(requestBody: unknown, role: Role.SERVICE_PROVIDER): Promise<IAuthResponse>
  registerAdmin(requestBody: unknown, role: Role.ADMIN): Promise<IAuthResponse>
  login(requestBody: unknown): Promise<IAuthResponse>
  listUsers(): Promise<{ users: any[] }>
  verifyEmail(userId: string): Promise<IAuthResponse>
}