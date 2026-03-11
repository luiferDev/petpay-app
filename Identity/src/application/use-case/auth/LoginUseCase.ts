import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'

import { DomainError, UserNotFoundError } from '../../../domain/errors/DomainError'
import { LoginRequest, LoginResponse } from '../../dtos/LoginDTOs' // DTOs que se definen en el siguiente paso

import { ITokenService } from '../../ports/ITokenService'
import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { compare } from 'bcrypt'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'

/**
 * @class LoginUseCase
 * @description Caso de uso para autenticar un usuario y generar tokens de sesión.
 * Gestiona la verificación de credenciales y la emisión de JWTs.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class LoginUseCase {
  constructor (
    @inject(INJECTION_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenProvider: ITokenService
  ) { }

  /**
   * Ejecuta el caso de uso de autenticación.
   * * @param {LoginRequest} request - Credenciales del usuario.
   * @returns {Promise<LoginResponse>} Tokens de acceso y datos del usuario.
   * @throws {UserNotFoundError} Si el usuario no existe.
   * @throws {DomainError} Si la contraseña es inválida.
   */
  public async execute (request: LoginRequest): Promise<LoginResponse> {
    const { email, password } = request

    console.log('[LoginUseCase] Attempting login for:', email)

    // 1. Buscar usuario (IUserRepository)
    const user = await this.userRepository.findByEmail(email)
    console.log('[LoginUseCase] User found:', user?.email, 'isVerified:', user?.isVerified)

    if (user == null) {
      // Usamos un error genérico aquí para no revelar si el email existe o no
      throw new UserNotFoundError('Invalid credentials')
    }

    // 2. Verificar contraseña
    const passwordMatch = await compare(password, user.passwordHash)
    console.log('[LoginUseCase] Password match:', passwordMatch)

    if (!passwordMatch) {
      throw new DomainError('Invalid credentials', 401)
    }

    // 3. Verificar estado (ej. cuenta no verificada)
    if (user.isVerified === false) {
      throw new DomainError('Account is not verified', 403)
    }

    // 4. Generar Tokens (ITokenProvider)
    const { accessToken, refreshToken } = this.tokenProvider.generateTokens(user)

    // 5. Retornar Respuesta (DTO)
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: `${String(user.firstName)} ${String(user.lastName)}`,
        roles: user.roles,
        isVerified: user.isVerified
      },
      accessToken,
      refreshToken
    }
  }
}
