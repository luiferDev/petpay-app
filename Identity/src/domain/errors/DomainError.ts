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
