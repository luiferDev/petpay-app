import { OAuthProviderError, OAuthLinkingError, OAuthProviderAlreadyLinkedError, OAuthInvalidStateError } from '../../../domain/errors/OAuthError'
import { ITokenProvider } from '../../ports/ITokenService'
import { IOAuthProvider, OAuthUserProfile, OAuthTokens } from '../../ports/IOAuthProvider'
import { IOAuthUserRepository } from '../../ports/IOAuthUserRepository'
import { OAuthStateManager } from '../../../infrastructure/services/OAuthStateManager'

const STATE_MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes

/**
 * @interface LinkOAuthProviderRequest
 * @description DTO de entrada para el caso de uso de vincular proveedor OAuth.
 */
export interface LinkOAuthProviderRequest {
  userId: string
  provider: 'google' | 'github'
  code: string
  state: string
  cookieState?: string
}

/**
 * @interface LinkOAuthProviderResponse
 * @description DTO de respuesta para el caso de uso de vincular proveedor OAuth.
 */
export interface LinkOAuthProviderResponse {
  provider: 'google' | 'github'
  linkedAt: Date
  message: string
}

/**
 * @class LinkOAuthProviderUseCase
 * @description Caso de uso para vincular un proveedor OAuth a un usuario existente.
 * El usuario debe estar autenticado para usar este caso de uso.
 */
export class LinkOAuthProviderUseCase {
  constructor (
    private readonly oauthProvider: IOAuthProvider,
    private readonly oauthUserRepository: IOAuthUserRepository,
    private readonly tokenProvider: ITokenProvider,
    private readonly stateManager: OAuthStateManager
  ) {}

  /**
   * Ejecuta el caso de uso de vincular proveedor OAuth.
   * @param {LinkOAuthProviderRequest} request - Datos del request.
   * @returns {Promise<LinkOAuthProviderResponse>} Respuesta de la vinculación.
   * @throws {OAuthInvalidStateError} Si el state es inválido.
   * @throws {OAuthProviderError} Si el proveedor OAuth falla.
   * @throws {OAuthLinkingError} Si la vinculación falla.
   * @throws {OAuthProviderAlreadyLinkedError} Si el proveedor ya está vinculado a otro usuario.
   */
  public async execute (request: LinkOAuthProviderRequest): Promise<LinkOAuthProviderResponse> {
    // 1. Validate state using OAuthStateManager
    const validationResult = this.stateManager.validateState(request.state, request.cookieState || '')

    if (!validationResult.isValid) {
      throw new OAuthInvalidStateError(validationResult.error?.message || 'Invalid state parameter')
    }

    // 2. Check timestamp expiration (10-minute window)
    if (validationResult.payload && this.stateManager.isExpired(validationResult.payload.timestamp, STATE_MAX_AGE_MS)) {
      throw new OAuthInvalidStateError('State parameter has expired')
    }

    // 3. Check if user already has this provider linked
    const existingLink = await this.oauthUserRepository.findByUserIdAndProvider(
      request.userId,
      request.provider
    )

    if (existingLink != null) {
      throw new OAuthLinkingError(`Provider ${request.provider} is already linked to this account`)
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

    // 4. Get user profile from provider
    let profile: OAuthUserProfile
    try {
      profile = await this.oauthProvider.getUserProfile(tokens.accessToken)
    } catch (error) {
      throw new OAuthProviderError(
        this.oauthProvider.providerName,
        `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // 5. Check if this provider is already linked to another user
    const existingProviderLink = await this.oauthUserRepository.findByProviderAndId(
      request.provider,
      profile.providerId
    )

    if ((existingProviderLink != null) && existingProviderLink.userId !== request.userId) {
      throw new OAuthProviderAlreadyLinkedError(
        request.provider,
        `This ${request.provider} account is already linked to another user`
      )
    }

    // 6. Create the link
    await this.oauthUserRepository.create({
      userId: request.userId,
      provider: request.provider,
      providerUserId: profile.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined
    })

    return {
      provider: request.provider,
      linkedAt: new Date(),
      message: `Successfully linked ${request.provider} account`
    }
  }
}
