import { Request, Response } from 'express'
import { inject, injectable } from 'tsyringe'
import { OAuthProviderFactory } from '../../services/OAuthProviderFactory'
import { OAuthLoginUseCase } from '../../../application/use-case/oauth/OAuthLoginUseCase'
import { LinkOAuthProviderUseCase } from '../../../application/use-case/oauth/LinkOAuthProviderUseCase'
import { DomainError } from '../../../domain/errors/DomainError'
import { logger } from '../../../shared/utils/logger'
import { isOAuthEnabled, isProviderConfigured } from '../../config/env'
import { INJECTION_TOKENS } from '../../DI/InjectionTokens'
import { ITokenProvider } from '../../../application/ports/ITokenService'
import { IOAuthUserRepository } from '../../../application/ports/IOAuthUserRepository'
import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { OAuthStateManager } from '../../services/OAuthStateManager'

/**
 * @class OAuthController
 * @description Controlador HTTP para los endpoints de OAuth.
 */
@injectable()
export class OAuthController {
  constructor (
    @inject(INJECTION_TOKENS.OAUTH_USER_REPOSITORY)
    private readonly oauthUserRepository: IOAuthUserRepository,
    @inject(INJECTION_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenProvider: ITokenProvider,
    @inject(INJECTION_TOKENS.OAUTH_STATE_MANAGER)
    private readonly stateManager: OAuthStateManager
  ) {}

  /**
   * GET /auth/oauth/:provider/initiate
   * Inicia el flujo OAuth redireccionando al proveedor.
   */
  initiate = (req: Request, res: Response): void => {
    const { provider } = req.params

    // Validate provider
    if (!this.isValidProvider(provider)) {
      res.status(400).json({
        error: 'INVALID_PROVIDER',
        message: `Invalid OAuth provider: ${provider}. Supported providers: google, github`
      })
      return
    }

    // Check if OAuth is enabled
    if (!isOAuthEnabled()) {
      res.status(503).json({
        error: 'OAUTH_DISABLED',
        message: 'OAuth is temporarily unavailable'
      })
      return
    }

    // Check if specific provider is configured
    if (!isProviderConfigured(provider as 'google' | 'github')) {
      res.status(503).json({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: `OAuth provider ${provider} is not configured`
      })
      return
    }

    // Generate signed state
    const state = this.stateManager.generateState()

    // Set state cookie (httpOnly, secure, 10 minutes)
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000 // 10 minutes
    })

    try {
      const authUrl = OAuthProviderFactory.getAuthorizationUrl(
        provider as 'google' | 'github',
        state
      )

      logger.info('OAuth flow initiated', { provider, state: state.substring(0, 8) + '...' })

      // Redirect to provider
      res.redirect(authUrl)
    } catch (error) {
      logger.error('Failed to initiate OAuth flow', { provider, error })
      res.status(500).json({
        error: 'OAUTH_INIT_FAILED',
        message: 'Failed to initiate OAuth flow'
      })
    }
  }

  /**
   * GET /auth/oauth/:provider/callback
   * Maneja el callback del proveedor OAuth.
   */
  callback = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params
    const { code, state } = req.query

    // Validate provider
    if (!this.isValidProvider(provider)) {
      res.status(400).json({
        error: 'INVALID_PROVIDER',
        message: `Invalid OAuth provider: ${provider}`
      })
      return
    }

    // Validate required params
    if (!code || !state) {
      res.status(400).json({
        error: 'MISSING_PARAMS',
        message: 'Missing code or state parameter'
      })
      return
    }

    // Read state from cookie
    const cookieState = req.cookies?.oauth_state

    // Clear the cookie immediately after reading
    res.clearCookie('oauth_state')

    try {
      const oauthProvider = OAuthProviderFactory.getProvider(provider as 'google' | 'github')

      // Create use case instance
      const oauthLoginUseCase = new OAuthLoginUseCase(
        oauthProvider,
        this.oauthUserRepository,
        this.userRepository,
        this.tokenProvider,
        this.stateManager
      )

      // Execute OAuth login
      const result = await oauthLoginUseCase.execute({
        provider: provider as 'google' | 'github',
        code: code as string,
        state: state as string,
        cookieState
      })

      // Set JWT cookies
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600000 // 1 hour
      })

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8640000000 // 24 hours
      })

      logger.info('OAuth login successful', { provider, userId: result.user.id })

      // Redirect to frontend
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      res.redirect(`${redirectUrl}/auth/callback?success=true`)
    } catch (error) {
      logger.error('OAuth callback failed', { provider, error })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      res.redirect(`${redirectUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`)
    }
  }

  /**
   * POST /auth/oauth/:provider/link
   * Vincula un proveedor OAuth a un usuario autenticado.
   */
  linkProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params
    const { code, state } = req.body
    const userId = req.user?.id

    // Check authentication
    if (!userId) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
      return
    }

    // Validate provider
    if (!this.isValidProvider(provider)) {
      res.status(400).json({
        error: 'INVALID_PROVIDER',
        message: `Invalid OAuth provider: ${provider}`
      })
      return
    }

    // Validate required params
    if (!code || !state) {
      res.status(400).json({
        error: 'MISSING_PARAMS',
        message: 'Missing code or state parameter'
      })
      return
    }

    // Read state from cookie
    const cookieState = req.cookies?.oauth_state

    // Clear the cookie after reading
    res.clearCookie('oauth_state')

    try {
      const oauthProvider = OAuthProviderFactory.getProvider(provider as 'google' | 'github')

      // Create use case instance
      const linkUseCase = new LinkOAuthProviderUseCase(
        oauthProvider,
        this.oauthUserRepository,
        this.tokenProvider,
        this.stateManager
      )

      const result = await linkUseCase.execute({
        userId,
        provider: provider as 'google' | 'github',
        code: code as string,
        state: state as string,
        cookieState
      })

      logger.info('OAuth provider linked', { provider, userId })

      res.status(200).json({
        status: 200,
        message: result.message,
        data: {
          provider: result.provider,
          linkedAt: result.linkedAt
        }
      })
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(error.suggestedHttpCode).json({
          error: error.name,
          message: error.message
        })
        return
      }

      logger.error('OAuth linking failed', { provider, userId, error })
      res.status(500).json({
        error: 'OAUTH_LINK_FAILED',
        message: 'Failed to link OAuth provider'
      })
    }
  }

  /**
   * Validates that the provider is supported.
   */
  private isValidProvider (provider: string): boolean {
    return provider === 'google' || provider === 'github'
  }
}
