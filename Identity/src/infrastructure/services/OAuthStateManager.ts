import { createHmac, randomBytes } from 'crypto'
import { OAuthInvalidStateError } from '../../domain/errors/OAuthError'

/**
 * @interface StatePayload
 * @description Payload decodificado del state parameter de OAuth.
 */
export interface StatePayload {
  /** Timestamp Unix (ms) cuando se generó el state */
  timestamp: number
  /** Valor aleatorio de 32 hex caracteres */
  random: string
  /** Firma HMAC-SHA256 del timestamp:random */
  signature: string
}

/**
 * @interface StateValidationResult
 * @description Resultado de la validación del state de OAuth.
 */
export interface StateValidationResult {
  /** Indica si el state es válido */
  isValid: boolean
  /** Error en caso de validación fallida */
  error?: OAuthInvalidStateError
  /** Payload decodificado si la validación fue exitosa */
  payload?: StatePayload
}

const STATE_SEPARATOR = ':'

/**
 * @class OAuthStateManager
 * @description Gestiona la generación y validación del state parameter de OAuth.
 *
 * El state se genera en formato: `timestamp:random:signature`
 * - timestamp: Date.now() en milisegundos
 * - random: 16 bytes aleatorios en hex (32 caracteres)
 * - signature: HMAC-SHA256 de `timestamp:random` usando OAUTH_STATE_SECRET
 *
 * Esta estructura previene ataques CSRF al:
 * 1. Verificar que el state de URL coincida con el de la cookie (double-submit cookie pattern)
 * 2. Validar la firma HMAC para detectar tampering
 * 3. Permitir expiración temporal del state
 *
 * @requires OAUTH_STATE_SECRET debe tener al menos 32 caracteres
 */
export class OAuthStateManager {
  private readonly secret: string

  constructor (secret: string) {
    if (secret === '' || secret.length < 32) {
      throw new Error('OAUTH_STATE_SECRET must be at least 32 characters')
    }
    this.secret = secret
  }

  /**
   * Genera un nuevo state parameter seguro.
   * @returns {string} State en formato `timestamp:random:signature`
   */
  public generateState (): string {
    const timestamp = Date.now()
    const random = randomBytes(16).toString('hex')
    const signature = this.createSignature(timestamp, random)

    return `${timestamp}${STATE_SEPARATOR}${random}${STATE_SEPARATOR}${signature}`
  }

  /**
   * Valida el state parameter de OAuth.
   *
   * Validaciones realizadas:
   * 1. Verifica que ambos parámetros (state y cookieState) estén presentes
   * 2. Verifica que sean idénticos (protección CSRF - double-submit)
   * 3. Verifica el formato (debe tener 3 partes separadas por :)
   * 4. Valida que el timestamp sea un número válido
   * 5. Valida la firma HMAC
   *
   * @param {string} state - State parameter de la URL
   * @param {string} cookieState - State de la cookie httpOnly
   * @returns {StateValidationResult} Resultado de la validación
   */
  public validateState (state: string, cookieState: string): StateValidationResult {
    if (state === '' || cookieState === '') {
      return {
        isValid: false,
        error: new OAuthInvalidStateError('Missing state parameter')
      }
    }

    if (state !== cookieState) {
      return {
        isValid: false,
        error: new OAuthInvalidStateError('State mismatch between request and cookie')
      }
    }

    const parts = state.split(STATE_SEPARATOR)
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: new OAuthInvalidStateError('Invalid state format')
      }
    }

    const timestampStr = parts[0]
    const random = parts[1]
    const signature = parts[2]

    if (timestampStr === undefined || random === undefined || signature === undefined) {
      return {
        isValid: false,
        error: new OAuthInvalidStateError('Invalid state format')
      }
    }

    const timestamp = Number.parseInt(timestampStr, 10)

    if (Number.isNaN(timestamp)) {
      return {
        isValid: false,
        error: new OAuthInvalidStateError('Invalid timestamp in state')
      }
    }

    const expectedSignature = this.createSignature(timestamp, random)
    if (signature !== expectedSignature) {
      return {
        isValid: false,
        error: new OAuthInvalidStateError('Invalid state signature')
      }
    }

    return {
      isValid: true,
      payload: {
        timestamp,
        random,
        signature
      }
    }
  }

  /**
   * Verifica si un timestamp ha expirado basado en una edad máxima.
   * @param {number} timestamp - Timestamp Unix en milisegundos a verificar
   * @param {number} maxAgeMs - Edad máxima permitida en milisegundos
   * @returns {boolean} True si el timestamp ha expirado
   */
  public isExpired (timestamp: number, maxAgeMs: number): boolean {
    const now = Date.now()
    const age = now - timestamp
    return age > maxAgeMs
  }

  private createSignature (timestamp: number, random: string): string {
    const data = `${timestamp}:${random}`
    return createHmac('sha256', this.secret).update(data).digest('hex')
  }
}
