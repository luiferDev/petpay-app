import { User } from '../entities/User'

/**
 * @interface IUserRepository
 * @description Port (interfaz) para operaciones de persistencia del Aggregate Root User.
 * Define el contrato de persistencia (CRUD) requerido por la capa de Aplicación.
 * * ⚠️ Principio: Un Repository solo debe manejar un Aggregate Root.
 * Las transacciones de registro/login son responsabilidad de los Use Cases.
 */
export interface IUserRepository {
  /**
   * Guarda o actualiza una entidad User.
   * @param {User} user - Usuario a persistir (contiene la lógica de persistencia de Account también si aplica el Aggregate).
   * @returns {Promise<User>} El usuario persistido.
   */
  save: (user: User) => Promise<User>

  /**
   * Busca un usuario por ID.
   * @param {string} id - ID del usuario (UUID).
   * @returns {Promise<User | null>} Usuario encontrado o null.
   */
  findById: (id: string) => Promise<User | null>

  /**
   * Busca un usuario por su dirección de correo electrónico.
   * @param {string} email - Correo electrónico del usuario.
   * @returns {Promise<User | null>} Usuario encontrado o null.
   */
  findByEmail: (email: string) => Promise<User | null>

  /**
   * Verifica si existe un usuario con el correo electrónico dado.
   * @param {string} email - Correo electrónico a verificar.
   * @returns {Promise<boolean>} True si existe un usuario con ese email.
   */
  existsByEmail: (email: string) => Promise<boolean>

  /**
   * Elimina un usuario por ID.
   * @param {string} id - ID del usuario a eliminar (UUID).
   */
  deleteById: (id: string) => Promise<void>

}
