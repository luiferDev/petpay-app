/**
 * @class DomainError
 * @description Clase base para todos los errores originados en la Capa de Dominio.
 * Permite a las capas superiores diferenciar entre errores de negocio
 * y errores técnicos (Infraestructura).
 * * @author Petpay Architecture Team
 * @version 1.0
 */
export class DomainError extends Error {
  /**
   * Código de estado HTTP sugerido para este error (ej. 409 Conflict).
   * @type {number}
   */
  public readonly suggestedHttpCode: number

  /**
   * @constructor
   * @param {string} message - Mensaje de error (para logging/desarrollo).
   * @param {number} suggestedHttpCode - Código HTTP sugerido.
   * @param {string} name - Nombre del error (por defecto, el nombre de la clase).
   */
  constructor (
    message: string,
    suggestedHttpCode: number = 500,
    name: string = 'DomainError'
  ) {
    super(message)
    this.name = name
    this.suggestedHttpCode = suggestedHttpCode
    // Fix para herencia en TypeScript/Bun
    Object.setPrototypeOf(this, DomainError.prototype)
  }
}

/**
 * @class UserNotFoundError
 * @description Error lanzado cuando un Aggregate Root User no puede ser encontrado.
 */
export class UserNotFoundError extends DomainError {
  constructor (message: string = 'User not found') {
    super(message, 404, 'UserNotFoundError')
    Object.setPrototypeOf(this, UserNotFoundError.prototype)
  }
}

/**
 * @class UserAlreadyExistsError
 * @description Error lanzado cuando se intenta crear un usuario con un identificador (email) ya registrado.
 */
export class UserAlreadyExistsError extends DomainError {
  constructor (message: string = 'User already exists with that email') {
    super(message, 409, 'UserAlreadyExistsError')
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype)
  }
}

/**
 * @class LockTimeoutError
 * @description Error thrown when an advisory lock cannot be acquired within the timeout.
 */
export class LockTimeoutError extends DomainError {
  constructor (message: string = 'Lock timeout: Could not acquire lock') {
    super(message, 423, 'LockTimeoutError')
    Object.setPrototypeOf(this, LockTimeoutError.prototype)
  }
}

/**
 * @class TokenNotFoundError
 * @description Error thrown when a refresh token is not found in Redis
 * (e.g., already used, revoked, or expired).
 */
export class TokenNotFoundError extends DomainError {
  constructor (message: string = 'Refresh token not found or already used') {
    super(message, 401, 'TokenNotFoundError')
    Object.setPrototypeOf(this, TokenNotFoundError.prototype)
  }
}

/**
 * @class InvalidTokenError
 * @description Error thrown when a refresh token is malformed or invalid.
 */
export class InvalidTokenError extends DomainError {
  constructor (message: string = 'Invalid refresh token') {
    super(message, 401, 'InvalidTokenError')
    Object.setPrototypeOf(this, InvalidTokenError.prototype)
  }
}

export class NotFoundError extends DomainError {
  constructor (message: string = 'Resource not found') {
    super(message, 404, 'NotFoundError')
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ValidationError extends DomainError {
  constructor (message: string = 'Validation failed') {
    super(message, 400, 'ValidationError')
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class ConflictError extends DomainError {
  constructor (message: string = 'Resource already exists') {
    super(message, 409, 'ConflictError')
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class UnauthorizedError extends DomainError {
  constructor (message: string = 'Unauthorized') {
    super(message, 401, 'UnauthorizedError')
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}
