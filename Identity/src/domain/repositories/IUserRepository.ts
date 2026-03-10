/**
 * @class IUserRepository
 * @description Contrato abstracto para el repositorio de usuarios.
 * Se define como clase abstracta para asegurar que Bun/TypeScript generen un token real en runtime.
 */
export abstract class IUserRepository {
  /**
   * Persiste un usuario en la base de datos.
   */
  abstract save(user: any): Promise<any>;

  /**
   * Busca un usuario por su ID único.
   */
  abstract findById(id: string): Promise<any | null>;

  /**
   * Busca un usuario por su correo electrónico.
   */
  abstract findByEmail(email: string): Promise<any | null>;

  /**
   * Verifica si un email ya está registrado.
   */
  abstract existsByEmail(email: string): Promise<boolean>;

  /**
   * Elimina un usuario por su ID.
   */
  abstract deleteById(id: string): Promise<void>;
}