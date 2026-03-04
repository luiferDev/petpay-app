// src/infrastructure/http/controllers/AuthController.ts

import { injectable, container } from 'tsyringe'
import { Request, Response } from 'express'
import path from 'path'
import { logger } from '../../../shared/utils/logger'
import { DomainError, UserNotFoundError } from '../../../domain/errors/DomainError'
import { LoginRequest } from '../../../application/dtos/LoginDTOs'
import { RegisterUserUseCase } from '../../../application/use-case/auth/RegisterUserUseCase'
import { LoginUseCase } from '../../../application/use-case/auth/LoginUseCase'
import { RegisterUserRequest } from '../../../application/dtos/RegisterUser.dto'
import { Role } from '../../../domain/types/Role'
import { INJECTION_TOKENS } from '../../DI/InjectionTokens'
import { userRegisterSchema } from '../validation/zod-schemas/register-schema'
import { ZodError } from 'zod'

/**
 * @class AuthController
 * @description Adaptador de presentación que gestiona las peticiones HTTP
 * para autenticación y registro. Mapea la entrada/salida HTTP a los Use Cases.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase
  ) { }

  /**
   * Endpoint POST /register
   * Registra un nuevo usuario con rol por defecto (USER).
   * @param {Request} req - Contiene el cuerpo a validar.
   */
  register = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validar y transformar el request body (divide fullName en firstName y lastName)
      const validatedData = userRegisterSchema.parse(req.body)

      const requestData: RegisterUserRequest = {
        email: validatedData.email,
        password: validatedData.password,
        firstName: validatedData.firstName!,
        lastName: validatedData.lastName!,
        role: Role.CLIENT
      }

      if (validatedData.phone) {
        requestData.phone = validatedData.phone
      }

      logger.info('Registration attempt started', { email: requestData.email, role: 'USER' })

      const result = await this.registerUseCase.execute({
        ...requestData,
        role: Role.CLIENT // Default role
      })

      return res.status(201).json({
        status: 201,
        message: 'User registered successfully. Verification email sent.',
        data: result
      })
    } catch (error) {
      // Manejo de errores de validación Zod
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 400,
          error: 'Validation Error',
          message: 'One or more fields are invalid.',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        })
      }

      // Mapeo de errores de Dominio a HTTP
      if (error instanceof DomainError) {
        return res.status(error.suggestedHttpCode).json({
          status: error.suggestedHttpCode,
          message: error.message,
          error: error.name
        })
      }

      // Enhanced error logging for debugging
      logger.error('Unexpected error during registration', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        email: (error as any)?.email || 'unknown'
      })
      return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }
  }

  /**
   * Endpoint POST /register/:role
   * Registra un nuevo usuario para un rol específico.
   * @param {Request} req - Contiene el cuerpo a validar y el rol en los parámetros.
   */
  registerByRole = async (req: Request, res: Response): Promise<Response> => {
    const { role } = req.params

    try {
      // Validar y transformar el request body
      const validatedData = userRegisterSchema.parse(req.body)

      const requestData: RegisterUserRequest = {
        email: validatedData.email,
        password: validatedData.password,
        firstName: validatedData.firstName!,
        lastName: validatedData.lastName!,
        role: (role?.toUpperCase() || 'CLIENT') as RegisterUserRequest['role']
      }

      if (validatedData.phone) {
        requestData.phone = validatedData.phone
      }

      logger.info('Registration attempt started', { email: requestData.email, role })

      const result = await this.registerUseCase.execute(requestData)

      return res.status(201).json({
        status: 201,
        message: 'User registered successfully. Verification email sent.',
        data: result
      })
    } catch (error) {
      // Manejo de errores de validación Zod
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 400,
          error: 'Validation Error',
          message: 'One or more fields are invalid.',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        })
      }

      // Mapeo de errores de Dominio a HTTP
      if (error instanceof DomainError) {
        return res.status(error.suggestedHttpCode).json({
          status: error.suggestedHttpCode,
          message: error.message,
          error: error.name
        })
      }

      // Enhanced error logging for debugging
      logger.error('Unexpected error during registration', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        email: (error as any)?.email || 'unknown'
      })
      return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }
  }

  /**
   * Endpoint POST /login
   * Autentica un usuario.
   * @param {Request} req - Contiene las credenciales a validar.
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

      // 2. Retornar Respuesta
      return res.status(200).json({
        status: 200,
        message: 'Login successful',
        data: {
          user: result.user
        }
      })
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return res.status(401).json({ status: 401, message: 'Invalid credentials' })
      }
      if (error instanceof DomainError) {
        return res.status(error.suggestedHttpCode).json({
          status: error.suggestedHttpCode,
          message: error.message
        })
      }

      logger.error('Unexpected error during login', { error })
      return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }
  }

  /**
   * Endpoint GET /users
   * Obtiene la lista de usuarios (Admin only).
   * @param {Request} req - Contiene el usuario autenticado.
   */
  listUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userRepository = container.resolve<any>(INJECTION_TOKENS.USER_REPOSITORY)
      const users = await userRepository.findAll()

      return res.status(200).json({
        status: 200,
        message: 'Users retrieved successfully',
        data: users.map((u: any) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          roles: u.roles,
          isVerified: u.isVerified
        }))
      })
    } catch (error) {
      logger.error('Error listing users', { error })
      return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }
  }

  /**
   * Endpoint GET /verify-email/:userId
   * Verifica el email de un usuario.
   * @param {Request} req - Contiene el userId en los parámetros.
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params

      if (!userId) {
        res.status(400).send('<h1>ID de usuario inválido</h1>')
        return
      }

      const userRepository = container.resolve<any>(INJECTION_TOKENS.USER_REPOSITORY)
      const user = await userRepository.findById(userId)

      if (!user) {
        res.status(404).send('<h1>Usuario no encontrado</h1>')
        return
      }

      user.markAsVerified()
      await userRepository.save(user)

      logger.info('Email verified successfully', { userId: user.id, email: user.email })

      res.status(200).render('verifySuccess')
    } catch (error) {
      logger.error('Error verifying email', { error })
      res.status(500).send('<h1>Error al verificar el email.</h1>')
    }
  }
}
