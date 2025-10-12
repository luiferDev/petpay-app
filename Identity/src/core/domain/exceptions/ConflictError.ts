/**
 * Excepción de dominio para errores de Conflicto (HTTP 409),
 * como un recurso que ya existe (ej. email duplicado).
 */
export class ConflictError extends Error {
  public statusCode: number

  constructor (message: string) {
    super(message)
    this.name = 'ConflictError'
    this.statusCode = 409
  }
}
