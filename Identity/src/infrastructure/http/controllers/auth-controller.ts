// src/infrastructure/http/controllers/AuthController.ts

import { Request, Response } from 'express'
import { injectable, inject } from 'tsyringe'
import { logger } from '../../../shared/utils/logger'
import { DomainError, UserNotFoundError } from '../../../domain/errors/DomainError'
import { LoginRequest } from '../../../application/dtos/LoginDTOs'
import { INJECTION_TOKENS } from '../../DI/InjectionTokens'
import { RegisterUserUseCase } from '../../../application/use-case/auth/RegisterUserUseCase'
import { LoginUseCase } from '../../../application/use-case/auth/LoginUseCase'
import { RegisterUserRequest } from '../../../application/dtos/RegisterUser.dto'

/**
 * @class AuthController
 * @description Adaptador de presentación que gestiona las peticiones HTTP
 * para autenticación y registro. Mapea la entrada/salida HTTP a los Use Cases.
 * * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class AuthController {
  constructor (
    @inject(INJECTION_TOKENS.REGISTER_USE_CASE)
    private readonly registerUseCase: RegisterUserUseCase,

    @inject(INJECTION_TOKENS.LOGIN_USE_CASE)
    private readonly loginUseCase: LoginUseCase

    // @inject(INJECTION_TOKENS.VERIFY_EMAIL_USE_CASE)
    // private readonly verifyEmailUseCase: VerifyEmailUseCase, // Pendiente de implementar
  ) {}

  /**
   * Endpoint POST /register/:role
   * Registra un nuevo usuario para un rol específico.
   * @param {Request} req - Contiene el cuerpo validado y el rol en los parámetros.
   */
  registerByRole = async (req: Request, res: Response): Promise<Response> => {
    const { role } = req.params

    // Los DTOs se asumen válidos gracias al validation.middleware
    const requestData: RegisterUserRequest = req.body

    try {
      logger.info('Registration attempt started', { email: requestData.email, role })

      const result = await this.registerUseCase.execute({
        ...requestData,
        // Usamos el rol de la URL para sobreescribir el rol en el DTO (si existe)
        role: role!.toUpperCase() as RegisterUserRequest['role']
      })

      return res.status(201).json({
        status: 201,
        message: 'User registered successfully. Verification email sent.',
        data: result
      })
    } catch (error) {
      // Mapeo de errores de Dominio a HTTP
      if (error instanceof DomainError) {
        return res.status(error.suggestedHttpCode).json({
          status: error.suggestedHttpCode,
          message: error.message,
          error: error.name
        })
      }

      logger.error('Unexpected error during registration', { error })
      return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }
  }

  /**
   * Endpoint POST /login
   * Autentica un usuario.
   * @param {Request} req - Contiene las credenciales validadas.
   */
  login = async (req: Request, res: Response): Promise<Response> => {
    const requestData: LoginRequest = req.body

    try {
      const result = await this.loginUseCase.execute(requestData)

      // 1. Configuración de Cookie (Seguridad)
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600000 // 1 hora
      })

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8640000000 // 24 horas
      })

      // 2. Retornar Respuesta (sin el accessToken en el cuerpo por seguridad)
      return res.status(200).json({
        status: 200,
        message: 'Login successful',
        data: {
          user: result.user
          // refreshToken: result.refreshToken, // El refresh token puede ir en el cuerpo o en otra cookie
        }
      })
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        // Usamos 401 para 'Invalid credentials' por seguridad.
        return res.status(401).json({ status: 401, message: 'Invalid credentials' })
      }
      if (error instanceof DomainError) {
        // Captura errores como 'Account is not verified' o 'Invalid credentials'
        return res.status(error.suggestedHttpCode).json({
          status: error.suggestedHttpCode,
          message: error.message
        })
      }

      logger.error('Unexpected error during login', { error })
      return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }
  }

  // TO DO: Refactorizar listUsers, verifyEmail
  // ... (otros métodos como listUsers y verifyEmail, siguiendo el mismo patrón)

  verifyEmail = async (req: Request, res: Response) => {
    const { userId } = req.params

    // Esto requiere un Use Case específico (VerifyEmailUseCase)
    // const result = await this.verifyEmailUseCase.execute({ userId });

    // Temporalmente, usamos el método render de Express para las vistas EJS
    // Aseguramos que la vista se busque en la nueva ruta: src/infrastructure/http/views/
    return res.status(200).render('verifySuccess', {
      success: true, // Asumiendo éxito temporalmente
      message: 'Verification successful (To be refactored)'
    })
  }
}
