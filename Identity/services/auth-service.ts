import { FullRegistrationRequestInput, fullRegistrationRequestSchema } from '../schema/register-schema'
import { LoginInput, loginSchema } from '../schema/login-schema'
import { logger } from '../lib/logger'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { Role } from '../template-method/register.template'
import { User, UserRole } from '../interfaces/IUserRepository'
import { IAuthService } from '../interfaces/IAuthService'
import { DrizzleUserRepository } from '../model/drizzle.user.repository'
import { EmailService } from './EmailService'

type UserType = Role

export class AuthService implements IAuthService {
  authRepository: DrizzleUserRepository
  emailService: EmailService
  constructor(authRepository: DrizzleUserRepository, emailService: EmailService
  ) {
    this.authRepository = authRepository
    this.emailService = emailService
  }

  private async registerUser(
    requestBody: Request,
    userType: UserType
  ): Promise<{
    status: number, message: string, data?:
    { userId: string, accountId: number },
    errors?: z.ZodError
  }> {
    try {
      const validatedData: FullRegistrationRequestInput = fullRegistrationRequestSchema.parse(requestBody)
      const userData = validatedData
      const accountData = validatedData.account

      // Seleccionar método según tipo de usuario
      let result
      switch (userType) {
        case Role.CLIENT:
          result = await this.authRepository.registerClient(userData, accountData)
          break
        case Role.SERVICE_PROVIDER:
          result = await this.authRepository.registerServiceProvider(userData, accountData)
          break
        case Role.ADMIN:
          result = await this.authRepository.registerAdmin(userData, accountData)
          break
        default:
          throw new Error(`Tipo de usuario no válido: ${userType}`)
      }

      const { userId, accountId } = result

      const verificationLink = `http://localhost:3000/auth/verify/${userId}`
      this.emailService.sendVerificationEmail(userData.email, userData.firstName, verificationLink)
        .then(() => logger.info('Correo de verificación enviado', { userId, userType }))
        .catch((error: unknown) => logger.error('Error al enviar el correo de verificación', { userId, error }))

      return {
        status: 201,
        message: `Registro de ${userType.toLowerCase()} completado.`,
        data: { userId, accountId }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { status: 400, message: 'Datos de entrada inválidos.', errors: error }
      }

      logger.error(`Error en registro de ${userType}`, { error: error instanceof Error ? error.message : error })
      return { status: 500, message: 'Error en la persistencia de datos.' }
    }
  }

  async registerClient(request: Request) {
    return this.registerUser(request, Role.CLIENT)
  }

  async registerServiceProvider(request: Request, role: Role.SERVICE_PROVIDER) {
    return this.registerUser(request, role)
  }

  async registerAdmin(request: Request, role: Role.ADMIN) {
    return this.registerUser(request, role)
  }

  async login(requestBody: Request):
    Promise<{
      status: number, message: string, 
      data?: User,
      token?: string,
      errors?: z.ZodError
    }> {
    try {
      logger.info('Validando datos de login')
      const validatedData: LoginInput = loginSchema.parse(requestBody)
      logger.info('Datos validados', { email: validatedData.email })

      logger.info('Buscando usuario')
      const { user, role } = await this.authRepository.loginUser(validatedData)
      logger.info('Usuario encontrado', { id: user.id, email: user.email, role })

      if (!role || !(role in UserRole)) {
        logger.warn('Usuario sin rol asignado o inválido', { userId: user.id, role })
        return { status: 403, message: 'Usuario no tiene rol asignado.' }
      }

      logger.info('Generando token JWT')

      const JWT_SECRET = process.env.JWT_SECRET_KEY ?? 'Secret_Awwesome_key'
      const token = jwt.sign(
        { id: user.id, email: user.email, role: role },
        JWT_SECRET,
        {
          expiresIn: '1h', algorithm: 'HS256',
          issuer: 'auth-service',
          audience: 'user-service',
          subject: user.id,
        })

      const userData: User = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isVerified: user.isVerified,
        role: { UserRole: role }
      }

      return {
        status: 200,
        message: 'Login exitoso.',
        data: userData,
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

  async listUsers(): Promise<{ users: User[] }> {
    const { users } = await this.authRepository.getAllUsers()
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
