import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'

import { DomainError, UserNotFoundError } from '../../../domain/errors/DomainError'
import { LoginRequest, LoginResponse } from '../../dtos/LoginDTOs' // DTOs que se definen en el siguiente paso

import { ITokenService } from '../../ports/ITokenService'
import { IRedisService } from '../../ports/IRedisService'
import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { compare } from 'bcrypt'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'
import { Config } from '../../../infrastructure/config/env'
import { logger } from '../../../shared/utils/logger'

const REFRESH_TOKEN_KEY_PREFIX = 'refresh_token'

function parseExpiryToSeconds (expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (match === null) {
    return 7 * 24 * 60 * 60
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value
    case 'm':
      return value * 60
    case 'h':
      return value * 60 * 60
    case 'd':
      return value * 24 * 60 * 60
    default:
      return 7 * 24 * 60 * 60
  }
}

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
    private readonly tokenProvider: ITokenService,
    @inject(INJECTION_TOKENS.REDIS_SERVICE)
    private readonly redisService: IRedisService
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
    const tokens = this.tokenProvider.generateTokensWithTokenId(user)
    const { accessToken, refreshToken } = tokens
    const tokenId: string | undefined = tokens.tokenId

    // 5. Store refresh token in Redis (if Redis is available)
    const userId = user.id
    if (userId !== undefined && userId !== null && tokenId !== undefined && tokenId !== null) {
      try {
        const ttlSeconds = parseExpiryToSeconds(Config.REFRESH_TOKEN_EXPIRY)
        const redisKey = `${REFRESH_TOKEN_KEY_PREFIX}:${String(userId)}:${String(tokenId)}`
        await this.redisService.set(redisKey, refreshToken, ttlSeconds)
        logger.debug('Refresh token stored in Redis', { userId, tokenId })
      } catch (error) {
        logger.warn('Failed to store refresh token in Redis (continuing anyway)', {
          userId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // 6. Retornar Respuesta (DTO)
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
