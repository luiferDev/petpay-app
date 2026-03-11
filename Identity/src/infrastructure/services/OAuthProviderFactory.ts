import { IOAuthProvider } from '../../application/ports/IOAuthProvider'
import { GoogleOAuthProvider } from './GoogleOAuthProvider'
import { GitHubOAuthProvider } from './GitHubOAuthProvider'
import { isProviderConfigured } from '../config/env'

/**
 * @class OAuthProviderFactory
 * @description Factory para crear instancias de proveedores OAuth.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OAuthProviderFactory {
  private static readonly instances: Map<string, IOAuthProvider> = new Map()

  /**
   * Obtiene una instancia del proveedor OAuth especificado.
   * @param {'google' | 'github'} provider - Nombre del proveedor
   * @returns {IOAuthProvider} Instancia del proveedor
   * @throws {Error} Si el proveedor no está configurado
   */
  static getProvider (provider: 'google' | 'github'): IOAuthProvider {
    // Return cached instance if available
    const cached = this.instances.get(provider)
    if (cached != null) {
      return cached
    }

    // Check if provider is configured
    if (!isProviderConfigured(provider)) {
      throw new Error(`OAuth provider ${provider} is not configured`)
    }

    // Create new instance
    let instance: IOAuthProvider
    switch (provider) {
      case 'google':
        instance = new GoogleOAuthProvider()
        break
      case 'github':
        instance = new GitHubOAuthProvider()
        break
      default:
        throw new Error('Unknown OAuth provider')
    }

    // Cache and return
    this.instances.set(provider, instance)
    return instance
  }

  /**
   * Obtiene la URL de autorización para el proveedor especificado.
   * @param {'google' | 'github'} provider - Nombre del proveedor
   * @param {string} state - State parameter para CSRF protection
   * @returns {string} URL de autorización
   */
  static getAuthorizationUrl (provider: 'google' | 'github', state: string): string {
    const oauthProvider = this.getProvider(provider)
    return oauthProvider.getAuthorizationUrl(state)
  }

  /**
   * Verifica si un proveedor específico está configurado.
   * @param {'google' | 'github'} provider - Nombre del proveedor
   * @returns {boolean} True si el proveedor está configurado
   */
  static isProviderConfigured (provider: 'google' | 'github'): boolean {
    return isProviderConfigured(provider)
  }

  /**
   * Limpia las instancias cacheadas (útil para testing).
   */
  static clearCache (): void {
    this.instances.clear()
  }
}
