import { hash } from 'bcrypt'
import { User } from '../../../domain/entities/User'
import { Role } from '../../../domain/types/Role'
import { OAuthProviderError, OAuthInvalidStateError } from '../../../domain/errors/OAuthError'
import { ITokenProvider } from '../../ports/ITokenService'
import { IOAuthProvider, OAuthUserProfile, OAuthTokens } from '../../ports/IOAuthProvider'
import { IOAuthUserRepository } from '../../ports/IOAuthUserRepository'
import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { OAuthStateManager } from '../../../infrastructure/services/OAuthStateManager'

const STATE_MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes

/**
 * @interface OAuthLoginRequest
 * @description DTO de entrada para el caso de uso de login OAuth.
 */
export interface OAuthLoginRequest {
  provider: 'google' | 'github'
  code: string
  state: string
  cookieState?: string
}

/**
 * @interface OAuthLoginResponse
 * @description DTO de respuesta para el caso de uso de login OAuth.
 */
export interface OAuthLoginResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    roles: Role[]
    isVerified: boolean
  }
  accessToken: string
  refreshToken: string
}

/**
 * @class OAuthLoginUseCase
 * @description Caso de uso para autenticar usuarios via OAuth.
 * Maneja el flujo completo: validar state, obtener tokens del proveedor,
 * obtener perfil de usuario, crear/vincular usuario, y generar JWT.
 */
export class OAuthLoginUseCase {
  private readonly SALT_ROUNDS = 12

  constructor (
    private readonly oauthProvider: IOAuthProvider,
    private readonly oauthUserRepository: IOAuthUserRepository,
    private readonly userRepository: IUserRepository,
    private readonly tokenProvider: ITokenProvider,
    private readonly stateManager: OAuthStateManager
  ) {}

  /**
   * Ejecuta el caso de uso de login OAuth.
   *
   * Flujo de validación de state (seguridad CSRF):
   * 1. El控制器 genera un state firmado con OAuthStateManager que contiene: timestamp:random:signature
   * 2. El state se envía tanto en la URL (state parameter) como en una cookie httpOnly (oauth_state)
   * 3. Este método valida que:
   *    - El state de URL coincida con el de la cookie (protección contra CSRF)
   *    - La firma HMAC sea válida (protección contra tampering)
   *    - El timestamp no haya expirado (máximo 10 minutos)
   *
   * @param {OAuthLoginRequest} request - Datos del request OAuth.
   * @param {string} request.provider - Proveedor OAuth ('google' | 'github').
   * @param {string} request.code - Código de autorización del proveedor OAuth.
   * @param {string} request.state - State parameter de la URL (firma para validar).
   * @param {string} [request.cookieState] - State de la cookie httpOnly (para validación cruzada).
   * @returns {Promise<OAuthLoginResponse>} Respuesta con usuario y tokens.
   * @throws {OAuthInvalidStateError} Si el state es inválido, está adulterado, o ha expirado.
   * @throws {OAuthProviderError} Si el proveedor OAuth falla.
   */
  public async execute (request: OAuthLoginRequest): Promise<OAuthLoginResponse> {
    // 1. Validate state using OAuthStateManager
    const validationResult = this.stateManager.validateState(request.state, request.cookieState || '')

    if (!validationResult.isValid) {
      throw validationResult.error
    }

    // 2. Check timestamp expiration (10-minute window)
    if (validationResult.payload && this.stateManager.isExpired(validationResult.payload.timestamp, STATE_MAX_AGE_MS)) {
      throw new OAuthInvalidStateError('State parameter has expired')
    }

    // 3. Exchange code for tokens
    let tokens: OAuthTokens
    try {
      tokens = await this.oauthProvider.exchangeCodeForTokens(request.code)
    } catch (error) {
      throw new OAuthProviderError(
        this.oauthProvider.providerName,
        `Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // 3. Get user profile from provider
    let profile: OAuthUserProfile
    try {
      profile = await this.oauthProvider.getUserProfile(tokens.accessToken)
    } catch (error) {
      throw new OAuthProviderError(
        this.oauthProvider.providerName,
        `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // 4. Find or create user
    const user = await this.findOrCreateUser(profile, tokens)

    // 5. Generate JWT tokens
    const jwtTokens = this.tokenProvider.generateTokensForOAuthUser(
      user.id,
      user.email,
      user.roles[0] || 'CLIENT'
    )

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isVerified: user.isVerified
      },
      accessToken: jwtTokens.accessToken,
      refreshToken: jwtTokens.refreshToken
    }
  }

  /**
   * @private
   * @method findOrCreateUser
   * @description Busca un usuario por proveedor OAuth o por email, y lo crea si no existe.
   */
  private async findOrCreateUser (
    profile: OAuthUserProfile,
    tokens: OAuthTokens
  ): Promise<User> {
    // 1. Try to find by OAuth provider + providerUserId
    const existingOAuthRecord = await this.oauthUserRepository.findByProviderAndId(
      profile.provider,
      profile.providerId
    )

    if (existingOAuthRecord != null) {
      // Update tokens
      await this.oauthUserRepository.updateTokens(existingOAuthRecord.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined
      })

      // Get user
      const user = await this.userRepository.findById(existingOAuthRecord.userId as any)
      if (user == null) {
        throw new OAuthProviderError(profile.provider, 'User not found for existing OAuth link')
      }
      return user
    }

    // 2. Try to find by email (for account linking)
    const existingUserByEmail = await this.userRepository.findByEmail(profile.email)

    if (existingUserByEmail != null) {
      // Link OAuth to existing user
      await this.oauthUserRepository.create({
        userId: existingUserByEmail.id as string,
        provider: profile.provider,
        providerUserId: profile.providerId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined
      })

      return existingUserByEmail
    }

    // 3. Create new user
    const passwordHash = await hash(crypto.randomUUID(), this.SALT_ROUNDS) // Random password for OAuth users

    const newUser = new User({
      email: profile.email,
      passwordHash,
      firstName: profile.displayName?.split(' ')[0] || profile.email.split('@')[0],
      lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
      roles: ['CLIENT'],
      isVerified: true // Email verified by OAuth provider
    })

    // Save user
    const savedUser = await this.userRepository.save(newUser)

    // Create OAuth link
    await this.oauthUserRepository.create({
      userId: savedUser.id as string,
      provider: profile.provider,
      providerUserId: profile.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined
    })

    return savedUser
  }
}
