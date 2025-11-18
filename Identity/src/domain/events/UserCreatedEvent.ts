import { Role } from '../types/Role';

/**
 * @interface UserCreatedEventPayload
 * @description Datos esenciales para el evento de creación de usuario.
 */
export interface UserCreatedEventPayload {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
}

/**
 * @class UserCreatedEvent
 * @description Evento de Dominio que se publica cuando un nuevo usuario
 * es registrado exitosamente en el Identity Service.
 * * Este evento es consumido por otros Bounded Contexts para sincronización
 * y activación (ej. crear un ServiceProviderProfile o un PetProfile).
 */
export class UserCreatedEvent {
  public readonly name: string = 'user.created';
  public readonly timestamp: Date;
  public readonly payload: UserCreatedEventPayload;

  /**
   * @constructor
   * @param {UserCreatedEventPayload} payload - Los datos del usuario creado.
   */
  constructor(payload: UserCreatedEventPayload) {
    this.payload = payload;
    this.timestamp = new Date();
  }
}