import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'

import { InvalidTokenError } from '../../../domain/errors/DomainError'
import { LogoutRequest, LogoutResponse } from '../../dtos/LogoutDTOs'

import { ITokenService } from '../../ports/ITokenService'
import { IRedisService } from '../../ports/IRedisService'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'

const REFRESH_TOKEN_KEY_PREFIX = 'refresh_token'

function buildRedisKey (userId: number, tokenId: string): string {
  return `${REFRESH_TOKEN_KEY_PREFIX}:${userId}:${tokenId}`
}

/**
 * @class LogoutUseCase
 * @description Use case for logging out a user by invalidating their refresh token in Redis.
 * The operation is idempotent - returns success even if the token is not found in Redis.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class LogoutUseCase {
  constructor (
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenService: ITokenService,
    @inject(INJECTION_TOKENS.REDIS_SERVICE)
    private readonly redisService: IRedisService
  ) { }

  /**
   * Executes the logout flow.
   * @param {LogoutRequest} request - The logout request containing the refresh token.
   * @returns {Promise<LogoutResponse>} Success message.
   * @throws {InvalidTokenError} If the refresh token is malformed or invalid.
   */
  public async execute (request: LogoutRequest): Promise<LogoutResponse> {
    const { refreshToken } = request

    console.log('[LogoutUseCase] Processing logout')

    let tokenPayload: ReturnType<typeof this.tokenService.verifyRefreshToken>

    try {
      tokenPayload = this.tokenService.verifyRefreshToken(refreshToken)
    } catch (error) {
      console.error('[LogoutUseCase] Token verification failed:', error)
      throw new InvalidTokenError('Invalid refresh token')
    }

    if (tokenPayload === undefined || tokenPayload === null) {
      throw new InvalidTokenError('Invalid refresh token')
    }

    const userId = tokenPayload.id
    const tokenId = tokenPayload.tokenId

    if (tokenId === undefined || tokenId === null || tokenId === '') {
      console.error('[LogoutUseCase] No tokenId in payload')
      throw new InvalidTokenError('Invalid refresh token: missing token ID')
    }

    console.log('[LogoutUseCase] User ID:', userId, 'Token ID:', tokenId)

    const redisKey = buildRedisKey(userId, tokenId)

    await this.redisService.delete(redisKey)

    console.log('[LogoutUseCase] Logout completed successfully')

    return {
      message: 'Logged out successfully'
    }
  }
}
