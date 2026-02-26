import { OAuth2Client } from 'google-auth-library'
import { IOAuthProvider, OAuthUserProfile, OAuthTokens } from '../../application/ports/IOAuthProvider'
import { Config, isProviderConfigured } from '../config/env'

/**
 * @class GoogleOAuthProvider
 * @description Implementación del proveedor OAuth para Google.
 */
export class GoogleOAuthProvider implements IOAuthProvider {
  public readonly providerName: 'google' = 'google'
  private readonly client: OAuth2Client
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly callbackUrl: string

  constructor () {
    if (!isProviderConfigured('google')) {
      throw new Error('Google OAuth is not configured')
    }

    this.clientId = Config.GOOGLE_CLIENT_ID!
    this.clientSecret = Config.GOOGLE_CLIENT_SECRET!
    this.callbackUrl = Config.GOOGLE_CALLBACK_URL!

    this.client = new OAuth2Client({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.callbackUrl
    })
  }

  /**
   * {@inheritDoc}
   */
  getAuthorizationUrl (state: string): string {
    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state,
      prompt: 'consent'
    })
    return url
  }

  /**
   * {@inheritDoc}
   */
  async exchangeCodeForTokens (code: string): Promise<OAuthTokens> {
    const { tokens } = await this.client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token from Google')
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : undefined
    }
  }

  /**
   * {@inheritDoc}
   */
  async getUserProfile (accessToken: string): Promise<OAuthUserProfile> {
    this.client.setCredentials({ access_token: accessToken })

    // Use the userinfo API to get the profile instead of verifyIdToken
    // verifyIdToken is for verifying Google Sign-In ID tokens, not OAuth2 access tokens
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get user profile from Google: ${response.statusText}`)
    }

    const payload = await response.json() as {
      id: string
      email: string
      name: string
      picture: string
    }

    if (!payload.id || !payload.email) {
      throw new Error('Failed to get user profile from Google')
    }

    return {
      provider: 'google',
      providerId: payload.id,
      email: payload.email,
      displayName: payload.name ?? undefined,
      avatarUrl: payload.picture ?? undefined
    }
  }
}
