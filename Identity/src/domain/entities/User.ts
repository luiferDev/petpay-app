import { Role } from '../types/Role';

/**
 * @interface UserProps
 * @description Propiedades de la entidad User.
 * Usamos una interfaz para definir la estructura de datos.
 */
export interface UserProps {
  id?: number;
  email: string;
  passwordHash: string; // Almacenamos el hash, no la contraseña plana
  firstName: string;
  lastName: string;
  phone?: string;
  roles: Role[];
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * @class User
 * @description Representa un usuario del sistema Petpay.
 * Es el Aggregate Root del bounded context de Identity.
 * Contiene la lógica de negocio y las invariantes del dominio.
 * * @author Petpay Architecture Team
 * @version 1.0
 * @since 2025-01-01
 */
export class User {
  public readonly id: number | undefined;
  public email: string;
  public passwordHash: string;
  public firstName: string;
  public lastName: string;
  public phone: string | undefined;
  public roles: Role[];
  public isVerified: boolean;
  public readonly createdAt: Date | undefined;
  public updatedAt: Date | undefined;

  /**
   * @constructor
   * @param {UserProps} props - Propiedades para crear la entidad.
   */
  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email.toLowerCase();
    this.passwordHash = props.passwordHash;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.phone = props.phone;
    this.roles = props.roles;
    this.isVerified = props.isVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    // Ejecutar validaciones al crear/cargar la entidad
    this.validateInvariants();
  }

  /**
   * Valida las invariantes del dominio (reglas que siempre deben ser ciertas).
   * @private
   * @throws {Error} Si alguna invariante falla.
   */
  private validateInvariants(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new Error('User must have a valid email address (Invariant failed)');
    }
    if (this.passwordHash.length < 60) {
      throw new Error('Password hash is too short (Invariant failed: Must be hashed)');
    }
    if (this.roles.length === 0) {
      throw new Error('User must have at least one role (Invariant failed)');
    }
  }

  /**
   * Marca la cuenta del usuario como verificada.
   */
  public markAsVerified(): void {
    if (!this.isVerified) {
      this.isVerified = true;
      this.updatedAt = new Date();
      // Nota: Aquí se podría generar un Domain Event 'UserVerifiedEvent'
    }
  }

  /**
   * Verifica si el usuario tiene un rol específico.
   * @param {Role} role - Rol a verificar.
   * @returns {boolean} True si el usuario tiene el rol.
   */
  public hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }
}