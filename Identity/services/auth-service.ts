import { FullRegistrationRequestInput, fullRegistrationRequestSchema } from '../schema/register-schema'
import { LoginInput, loginSchema } from '../schema/login-schema'
import { UserRepository } from '../model/user-repository'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { sendVerificationEmail } from '../utils/nodemailer'
import jwt from 'jsonwebtoken'

export class AuthService {
  private readonly authRepository: typeof UserRepository

  constructor({ authRepository }: { authRepository: typeof UserRepository }) {
    this.authRepository = authRepository
  }

  async register(requestBody: unknown): Promise<{ status: number, message: string, data?: { userId: string, accountId: number }, errors?: z.ZodError }> {
    try {
      const validatedData: FullRegistrationRequestInput = fullRegistrationRequestSchema.parse(requestBody)
      const userData = validatedData
      const accountData = validatedData.account

      const { userId, accountId } = await this.authRepository.registerUser(
        userData,
        accountData
      )

      const verificationLink = `http://localhost:3000/auth/verify/${userId}`
      sendVerificationEmail(userData.email, userData.firstName, verificationLink)
        .then(() => logger.info('Correo de verificación enviado', { userId }))
        .catch((error: unknown) => logger.error('Error al enviar el correo de verificación', { userId, error }))

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
  async login(requestBody: unknown): Promise<{ status: number, message: string, data?: any, token?: string, errors?: z.ZodError }> {
    try {
      logger.info('Validando datos de login')
      const validatedData: LoginInput = loginSchema.parse(requestBody)
      logger.info('Datos validados', { email: validatedData.email })

      logger.info('Buscando usuario')
      const {user, role} = await this.authRepository.loginUser(validatedData)
      logger.info('Usuario encontrado', { id: user.id, email: user.email })
      
      
      const JWT_SECRET = process.env.JWT_SECRET_KEY ?? 'Secret_Awwesome_key'
      const token = jwt.sign(
        { id: user.id, email: user.email, role: role },
        JWT_SECRET,
        { expiresIn: '1h' })

      return {
        status: 200,
        message: 'Login exitoso.',
        data: { userId: user.id, email: user.email, role: role },
        token
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

  async verifyEmail(userId: string): Promise<{ status: number, message: string, data?: any }> {
    try {
      logger.info('Verificando email de usuario', { userId })
      const user = await this.authRepository.verifyUser(userId)
      logger.info('Usuario verificado exitosamente', { userId: user.id })

      return {
        status: 200,
        message: 'Email verificado exitosamente.',
        data: { userId: user.id, email: user.email, isVerified: user.isVerified }
      }
    } catch (error) {
      logger.error('Error al verificar email', { userId, error: error instanceof Error ? error.message : error })

      if (error instanceof Error && error.message === 'Usuario no encontrado') {
        return { status: 404, message: 'Usuario no encontrado.' }
      }

      return { status: 500, message: 'Error interno del servidor.' }
    }
  }
}
