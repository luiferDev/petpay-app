import { FullRegistrationRequestInput, fullRegistrationRequestSchema } from '../schema/register-schema'
import { LoginInput, loginSchema } from '../schema/login-schema'
import { UserRepository } from '../model/user-repository'
import { logger } from '../lib/logger'
import { z } from 'zod'

export class AuthService {
  private readonly authRepository: typeof UserRepository

  constructor ({ authRepository }: { authRepository: typeof UserRepository }) {
    this.authRepository = authRepository
  }

  async register (requestBody: unknown): Promise<{ status: number, message: string, data?: { userId: string, accountId: number }, errors?: z.ZodError }> {
    try {
      const validatedData: FullRegistrationRequestInput = fullRegistrationRequestSchema.parse(requestBody)
      const userData = validatedData
      const accountData = validatedData.account

      const { userId, accountId } = await this.authRepository.registerUser(
        userData,
        accountData
      )

      return {
        status: 201,
        message: 'Registro completado.',
        data: { userId, accountId }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { status: 400, message: 'Datos de entrada inválidos.', errors: error }
      }

      logger.error('Error en el registro', { error: error instanceof Error ? error.message : error })
      return { status: 500, message: 'Error en la persistencia de datos.' }
    }
  }
  async login (requestBody: unknown): Promise<{ status: number, message: string, data?: any, errors?: z.ZodError }> {
    try {
      logger.info('Validando datos de login')
      const validatedData: LoginInput = loginSchema.parse(requestBody)
      logger.info('Datos validados', { email: validatedData.email })
      
      logger.info('Buscando usuario')
      const user = await this.authRepository.loginUser(validatedData)
      logger.info('Usuario encontrado', { id: user.id, email: user.email })
      
      return {
        status: 200,
        message: 'Login exitoso.',
        data: { userId: user.id, email: user.email }
      }
    } catch (error) {
      logger.error('Error en login', { error: error instanceof Error ? error.message : error })
      
      if (error instanceof z.ZodError) {
        logger.error('Error de validación', { error })
        return { status: 400, message: 'Datos de entrada inválidos.', errors: error }
      }

      if (error instanceof Error) {
        logger.error('Error de autenticación', { message: error.message })
        return { status: 401, message: error.message }
      }

      logger.error('Error desconocido en el login', { error })
      return { status: 500, message: 'Error interno del servidor.' }
    }
  }

  async listUsers() {
    const users = await this.authRepository.getAllUsers()
    return { users }
  }
}
