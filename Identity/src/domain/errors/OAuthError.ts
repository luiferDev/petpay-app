import { DomainError } from './DomainError'

/**
 * @class OAuthProviderError
 * @description Error thrown when an OAuth provider returns an error.
 */
export class OAuthProviderError extends DomainError {
  public readonly provider: string

  constructor (provider: string, message: string = 'OAuth provider error') {
    super(message, 401, 'OAuthProviderError')
    this.provider = provider
    Object.setPrototypeOf(this, OAuthProviderError.prototype)
  }
}

/**
 * @class OAuthInvalidStateError
 * @description Error thrown when the OAuth state parameter is invalid or missing.
 */
export class OAuthInvalidStateError extends DomainError {
  constructor (message: string = 'Invalid OAuth state parameter') {
    super(message, 400, 'OAuthInvalidStateError')
    Object.setPrototypeOf(this, OAuthInvalidStateError.prototype)
  }
}

/**
 * @class OAuthLinkingError
 * @description Error thrown when linking an OAuth provider fails.
 */
export class OAuthLinkingError extends DomainError {
  constructor (message: string = 'Failed to link OAuth provider') {
    super(message, 409, 'OAuthLinkingError')
    Object.setPrototypeOf(this, OAuthLinkingError.prototype)
  }
}

/**
 * @class OAuthProviderUnavailableError
 * @description Error thrown when an OAuth provider is unavailable.
 */
export class OAuthProviderUnavailableError extends DomainError {
  public readonly provider: string

  constructor (provider: string, message: string = 'OAuth provider unavailable') {
    super(message, 503, 'OAuthProviderUnavailableError')
    this.provider = provider
    Object.setPrototypeOf(this, OAuthProviderUnavailableError.prototype)
  }
}

/**
 * @class OAuthProviderRateLimitedError
 * @description Error thrown when the OAuth provider rate limits the request.
 */
export class OAuthProviderRateLimitedError extends DomainError {
  public readonly provider: string

  constructor (provider: string, message: string = 'OAuth provider rate limited') {
    super(message, 429, 'OAuthProviderRateLimitedError')
    this.provider = provider
    Object.setPrototypeOf(this, OAuthProviderRateLimitedError.prototype)
  }
}

/**
 * @class OAuthUserNotFoundError
 * @description Error thrown when an OAuth user cannot be found.
 */
export class OAuthUserNotFoundError extends DomainError {
  constructor (message: string = 'OAuth user not found') {
    super(message, 404, 'OAuthUserNotFoundError')
    Object.setPrototypeOf(this, OAuthUserNotFoundError.prototype)
  }
}

/**
 * @class OAuthProviderAlreadyLinkedError
 * @description Error thrown when trying to link an OAuth provider that is already linked to another user.
 */
export class OAuthProviderAlreadyLinkedError extends DomainError {
  public readonly provider: string

  constructor (provider: string, message: string = 'OAuth provider already linked to another account') {
    super(message, 409, 'OAuthProviderAlreadyLinkedError')
    this.provider = provider
    Object.setPrototypeOf(this, OAuthProviderAlreadyLinkedError.prototype)
  }
}
