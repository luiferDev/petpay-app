import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'

import { TokenNotFoundError, InvalidTokenError } from '../../../domain/errors/DomainError'
import { RefreshTokenRequest, RefreshTokenResponse } from '../../dtos/RefreshTokenDTOs'

import { ITokenService } from '../../ports/ITokenService'
import { IRedisService } from '../../ports/IRedisService'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'
import { Config } from '../../../infrastructure/config/env'

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

function buildRedisKey (userId: number, tokenId: string): string {
  return `${REFRESH_TOKEN_KEY_PREFIX}:${userId}:${tokenId}`
}

/**
 * @class RefreshTokenUseCase
 * @description Use case for refreshing JWT tokens with Redis validation and rotation.
 * Validates the refresh token in Redis, invalidates the old token, generates new tokens,
 * and stores the new refresh token in Redis.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class RefreshTokenUseCase {
  constructor (
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenService: ITokenService,
    @inject(INJECTION_TOKENS.REDIS_SERVICE)
    private readonly redisService: IRedisService
  ) { }

  /**
   * Executes the token refresh flow.
   * @param {RefreshTokenRequest} request - The refresh token request.
   * @returns {Promise<RefreshTokenResponse>} New access and refresh tokens.
   * @throws {InvalidTokenError} If the refresh token is malformed or invalid.
   * @throws {TokenNotFoundError} If the token is not found in Redis (already used/revoked).
   */
  public async execute (request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { refreshToken } = request

    console.log('[RefreshTokenUseCase] Processing token refresh')

    let tokenPayload: ReturnType<typeof this.tokenService.verifyRefreshToken>

    try {
      tokenPayload = this.tokenService.verifyRefreshToken(refreshToken)
    } catch (error) {
      console.error('[RefreshTokenUseCase] Token verification failed:', error)
      throw new InvalidTokenError('Invalid refresh token')
    }

    if (tokenPayload === undefined || tokenPayload === null) {
      throw new InvalidTokenError('Invalid refresh token')
    }

    const userId = tokenPayload.id
    const tokenId = tokenPayload.tokenId

    if (tokenId === undefined || tokenId === null || tokenId === '') {
      console.error('[RefreshTokenUseCase] No tokenId in payload')
      throw new InvalidTokenError('Invalid refresh token: missing token ID')
    }

    console.log('[RefreshTokenUseCase] User ID:', userId, 'Token ID:', tokenId)

    const redisKey = buildRedisKey(userId, tokenId)

    const storedToken = await this.redisService.get(redisKey)
    if (storedToken === null) {
      console.log('[RefreshTokenUseCase] Token not found in Redis - already used or revoked')
      throw new TokenNotFoundError('Refresh token not found or already used')
    }

    console.log('[RefreshTokenUseCase] Token found in Redis, invalidating old token')

    await this.redisService.delete(redisKey)

    console.log('[RefreshTokenUseCase] Generating new tokens')

    const { accessToken, refreshToken: newRefreshToken, tokenId: newTokenId } =
      this.tokenService.generateTokensWithTokenId({
        id: userId,
        email: tokenPayload.email,
        roles: [tokenPayload.role]
      } as any)

    const ttlSeconds = parseExpiryToSeconds(Config.REFRESH_TOKEN_EXPIRY)
    const newRedisKey = buildRedisKey(userId, newTokenId)

    console.log('[RefreshTokenUseCase] Storing new token with TTL:', ttlSeconds, 'seconds')

    await this.redisService.set(newRedisKey, newRefreshToken, ttlSeconds)

    console.log('[RefreshTokenUseCase] Token refresh completed successfully')

    return {
      accessToken,
      refreshToken: newRefreshToken
    }
  }
}
