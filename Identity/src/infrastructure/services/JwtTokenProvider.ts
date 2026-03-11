import * as jwt from 'jsonwebtoken'
import { SignOptions, VerifyOptions } from 'jsonwebtoken'
import { User } from '../../domain/entities/User'
import { Role } from '../../domain/types/Role'
import { ITokenService } from '../../application/ports/ITokenService'
import { Config } from '../config/env'
import { injectable, singleton } from 'tsyringe'

export const TOKENS = {
  Database: Symbol('Database'),
  Transport: Symbol('Transport')
} as const

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

  /**
   * {@inheritDoc}
   */
  generateTokens (user: User): { accessToken: string, refreshToken: string } {
    const payload = {
      id: user.id,
      email: user.email,
      role: (user.roles[0] != null) ?? Role.CLIENT
    }

    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry
    }
    const accessToken = jwt.sign(payload, this.jwtSecret, accessTokenOptions)

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiry
    }
    const refreshToken = jwt.sign(payload, this.jwtSecret, refreshTokenOptions)

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

    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry
    }
    const accessToken = jwt.sign(payload, this.jwtSecret, accessTokenOptions)

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiry
    }
    const refreshToken = jwt.sign(payload, this.jwtSecret, refreshTokenOptions)

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
