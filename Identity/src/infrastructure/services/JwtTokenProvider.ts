import * as jwt from 'jsonwebtoken'
import { SignOptions, VerifyOptions } from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { User } from '../../domain/entities/User'
import { Role } from '../../domain/types/Role'
import { ITokenService, TokenPayload } from '../../application/ports/ITokenService'
import { Config } from '../config/env'
import { injectable, singleton } from 'tsyringe'

export const TOKENS = {
  Database: Symbol('Database'),
  Transport: Symbol('Transport')
} as const

interface AccessTokenPayload {
  id: number
  email: string
  role: Role
}

interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string
}

/**
 * @class JwtTokenProvider
 * @description Implementación del proveedor de tokens JWT.
 * Maneja la generación y verificación de tokens de acceso y refresh.
 */
@injectable()
@singleton()
export class JwtTokenProvider implements ITokenService {
  private readonly jwtSecret: string
  private readonly accessTokenExpiry: string
  private readonly refreshTokenExpiry: string

  constructor () {
    this.jwtSecret = Config.JWT_SECRET
    this.accessTokenExpiry = Config.ACCESS_TOKEN_EXPIRY
    this.refreshTokenExpiry = Config.REFRESH_TOKEN_EXPIRY
  }

  private generateTokenId (): string {
    return randomUUID()
  }

  /**
   * {@inheritDoc}
   */
  generateTokens (user: User): { accessToken: string, refreshToken: string } {
    const tokenId: string = this.generateTokenId()

    const accessPayload: AccessTokenPayload = {
      id: user.id,
      email: user.email,
      role: (user.roles[0] != null) ? user.roles[0] : Role.CLIENT
    }

    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      jti: tokenId
    }

    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry
    }
    const accessToken = jwt.sign(accessPayload, this.jwtSecret, accessTokenOptions)

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiry
    }
    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, refreshTokenOptions)

    return { accessToken, refreshToken }
  }

  /**
   * {@inheritDoc}
   */
  generateTokensWithTokenId (user: User): { accessToken: string, refreshToken: string, tokenId: string } {
    const tokenId: string = this.generateTokenId()

    const accessPayload: AccessTokenPayload = {
      id: user.id,
      email: user.email,
      role: (user.roles[0] != null) ? user.roles[0] : Role.CLIENT
    }

    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      jti: tokenId
    }

    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry
    }
    const accessToken = jwt.sign(accessPayload, this.jwtSecret, accessTokenOptions)

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiry
    }
    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, refreshTokenOptions)

    return { accessToken, refreshToken, tokenId }
  }

  /**
   * {@inheritDoc}
   */
  generateTokensForOAuthUser (
    userId: string,
    email: string,
    role: Role
  ): { accessToken: string, refreshToken: string } {
    const tokenId: string = this.generateTokenId()

    const accessPayload: AccessTokenPayload = {
      id: Number(userId),
      email,
      role
    }

    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      jti: tokenId
    }

    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry
    }
    const accessToken = jwt.sign(accessPayload, this.jwtSecret, accessTokenOptions)

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiry
    }
    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, refreshTokenOptions)

    return { accessToken, refreshToken }
  }

  /**
   * {@inheritDoc}
   */
  generateTokensWithTokenIdForOAuthUser (
    userId: string,
    email: string,
    role: Role
  ): { accessToken: string, refreshToken: string, tokenId: string } {
    const tokenId: string = this.generateTokenId()

    const accessPayload: AccessTokenPayload = {
      id: Number(userId),
      email,
      role
    }

    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      jti: tokenId
    }

    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry
    }
    const accessToken = jwt.sign(accessPayload, this.jwtSecret, accessTokenOptions)

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiry
    }
    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, refreshTokenOptions)

    return { accessToken, refreshToken, tokenId }
  }

  /**
   * {@inheritDoc}
   */
  verifyToken (token: string): TokenPayload {
    const options: VerifyOptions = {
      algorithms: ['HS256']
    }
    const payload = jwt.verify(token, this.jwtSecret, options) as AccessTokenPayload
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role
    }
  }

  /**
   * {@inheritDoc}
   */
  verifyRefreshToken (token: string): TokenPayload {
    const options: VerifyOptions = {
      algorithms: ['HS256']
    }
    const payload = jwt.verify(token, this.jwtSecret, options) as RefreshTokenPayload
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tokenId: payload.jti
    }
  }

  /**
   * {@inheritDoc}
   */
  generateVerificationToken (userId: string, email: string): string {
    const payload = {
      userId,
      email,
      type: 'email_verification'
    }

    const verificationTokenOptions: SignOptions = {
      expiresIn: '24h' // Token válido por 24 horas
    }
    return jwt.sign(payload, this.jwtSecret, verificationTokenOptions)
  }
}
