import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken'
import { User } from '../../domain/entities/User'
import { Role } from '../../domain/types/Role'
import { ITokenProvider } from '../../application/ports/ITokenService'
import { Config } from '../config/env'

export const TOKENS = {
  Database: Symbol('Database'),
  Transport: Symbol('Transport')
} as const

/**
 * @class JwtTokenProvider
 * @description Implementación del proveedor de tokens JWT.
 * Maneja la generación y verificación de tokens de acceso y refresh.
 */
export class JwtTokenProvider implements ITokenProvider {
  private readonly jwtSecret: string
  private readonly accessTokenExpiry: string
  private readonly refreshTokenExpiry: string

  constructor () {
    this.jwtSecret = Config.JWT_SECRET
    this.accessTokenExpiry = Config.ACCESS_TOKEN_EXPIRY
    this.refreshTokenExpiry = Config.REFRESH_TOKEN_EXPIRY
  }

  /**
   * {@inheritDoc}
   */
  generateTokens (user: User): { accessToken: string, refreshToken: string } {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.roles[0] || Role.CLIENT
    }

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    } as SignOptions)

    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry
    } as SignOptions)

    return { accessToken, refreshToken }
  }

  /**
   * {@inheritDoc}
   */
  generateTokensForOAuthUser (
    userId: string,
    email: string,
    role: Role
  ): { accessToken: string, refreshToken: string } {
    const payload = {
      id: userId,
      email,
      role
    }

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    } as SignOptions)

    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry
    } as SignOptions)

    return { accessToken, refreshToken }
  }

  /**
   * {@inheritDoc}
   */
  verifyToken (token: string): any {
    const options: VerifyOptions = {
      algorithms: ['HS256']
    }
    return jwt.verify(token, this.jwtSecret, options)
  }
}
