import { DomainError, UserNotFoundError } from '../../../domain/errors/DomainError'
import { LoginRequest, LoginResponse } from '../../dtos/LoginDTOs' // DTOs que se definen en el siguiente paso

import { ITokenProvider } from '../../ports/ITokenService'
import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { compare } from 'bcrypt'

/**
 * @class LoginUseCase
 * @description Caso de uso para autenticar un usuario y generar tokens de sesión.
 * Gestiona la verificación de credenciales y la emisión de JWTs.
 * @author Petpay Architecture Team
 * @version 1.0
 */
export class LoginUseCase {
  constructor (
    private readonly userRepository: IUserRepository,
    private readonly tokenProvider: ITokenProvider
  ) {}

  /**
   * Ejecuta el caso de uso de autenticación.
   * * @param {LoginRequest} request - Credenciales del usuario.
   * @returns {Promise<LoginResponse>} Tokens de acceso y datos del usuario.
   * @throws {UserNotFoundError} Si el usuario no existe.
   * @throws {DomainError} Si la contraseña es inválida.
   */
  public async execute (request: LoginRequest): Promise<LoginResponse> {
    const { email, password } = request

    // 1. Buscar usuario (IUserRepository)
    const user = await this.userRepository.findByEmail(email)

    if (user == null) {
      // Usamos un error genérico aquí para no revelar si el email existe o no
      throw new UserNotFoundError('Invalid credentials')
    }

    // 2. Verificar contraseña
    const passwordMatch = await compare(password, user.passwordHash)

    if (!passwordMatch) {
      throw new DomainError('Invalid credentials', 401)
    }

    // 3. Verificar estado (ej. cuenta no verificada)
    if (!user.isVerified) {
      throw new DomainError('Account is not verified', 403)
    }

    // 4. Generar Tokens (ITokenProvider)
    const { accessToken, refreshToken } = this.tokenProvider.generateTokens(user)

    // 5. Retornar Respuesta (DTO)
    return {
      user: {
        id: user.id!,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        roles: user.roles,
        isVerified: user.isVerified
      },
      accessToken,
      refreshToken
    }
  }
}
