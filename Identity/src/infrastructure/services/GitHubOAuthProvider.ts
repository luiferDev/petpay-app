import { IOAuthProvider, OAuthUserProfile, OAuthTokens } from '../../application/ports/IOAuthProvider'
import { Config, isProviderConfigured } from '../config/env'

/**
 * @class GitHubOAuthProvider
 * @description Implementación del proveedor OAuth para GitHub.
 */
export class GitHubOAuthProvider implements IOAuthProvider {
  public readonly providerName: 'github' = 'github'
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly callbackUrl: string
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token'
  private readonly userApiUrl = 'https://api.github.com/user'
  private readonly userEmailsApiUrl = 'https://api.github.com/user/emails'

  constructor () {
    if (!isProviderConfigured('github')) {
      throw new Error('GitHub OAuth is not configured')
    }

    this.clientId = Config.GITHUB_CLIENT_ID!
    this.clientSecret = Config.GITHUB_CLIENT_SECRET!
    this.callbackUrl = Config.GITHUB_CALLBACK_URL!
  }

  /**
   * {@inheritDoc}
   */
  getAuthorizationUrl (state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'user:email read:user',
      state
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * {@inheritDoc}
   */
  async exchangeCodeForTokens (code: string): Promise<OAuthTokens> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to exchange code for tokens: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    if (!data.access_token) {
      throw new Error('Failed to obtain access token from GitHub')
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? undefined,
      expiresIn: data.expires_in
    }
  }

  /**
   * {@inheritDoc}
   */
  async getUserProfile (accessToken: string): Promise<OAuthUserProfile> {
    // Get user profile
    const userResponse = await fetch(this.userApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })

    if (!userResponse.ok) {
      const error = await userResponse.text()
      throw new Error(`Failed to get user profile from GitHub: ${error}`)
    }

    const userData = await userResponse.json() as {
      id: number
      login: string
      name: string | null
      email: string | null
      avatar_url: string
    }

    // If email is not public, fetch from emails endpoint
    let email = userData.email
    if (!email) {
      const emailsResponse = await fetch(this.userEmailsApiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as Array<{
          email: string
          primary: boolean
          verified: boolean
        }>
        const primaryEmail = emails.find(e => e.primary && e.verified)
        email = primaryEmail?.email ?? emails[0]?.email ?? null
      }
    }

    if (!email) {
      throw new Error('Could not obtain email from GitHub')
    }

    return {
      provider: 'github',
      providerId: String(userData.id),
      email,
      displayName: userData.name ?? userData.login,
      avatarUrl: userData.avatar_url
    }
  }
}
