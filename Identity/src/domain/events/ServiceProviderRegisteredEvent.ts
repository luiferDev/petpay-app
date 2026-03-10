// src/domain/events/ServiceProviderRegisteredEvent.ts

import { Role } from '../types/Role'
import { ulid } from 'ulid' // Asumimos la utilidad ULID para IDs de evento

/**
 * @interface ServiceProviderRegisteredPayload
 * @description Payload (carga útil) con la información mínima necesaria
 * para que el servicio de Proveedores inicialice el perfil.
 */
export interface ServiceProviderRegisteredPayload {
  /**
   * ID único del usuario (proveedor) que acaba de ser registrado.
   * Este es el ID clave para la futura relación.
   */
  userId: string

  /**
   * Correo electrónico del proveedor.
   */
  email: string

  /**
   * Nombre completo del proveedor.
   */
  fullName: string

  /**
   * La fecha y hora de registro.
   */
  registrationDate: Date

  /**
   * El estado de verificación inicial. Debe ser 'false' para forzar el proceso
   * de onboarding y verificación en el Providers Service.
   */
  isVerified: boolean

  /**
   * El rol que activa la creación de este perfil (debe ser 'SERVICE_PROVIDER').
   */
  role: Role
}

/**
 * @class ServiceProviderRegisteredEvent
 * @description Evento de Dominio publicado cuando un usuario se registra
 * con el rol de 'SERVICE_PROVIDER'.
 * * @author Petpay Architecture Team
 * @version 1.0
 * @since 2025-01-01
 */
export class ServiceProviderRegisteredEvent {
  /**
   * Nombre único del evento (Routing Key para RabbitMQ: 'service.provider.registered').
   */
  public readonly name = 'service.provider.registered'

  /**
   * ID único de la instancia del evento (para trazabilidad).
   */
  public readonly eventId: string

  /**
   * El timestamp de cuándo fue creado el evento.
   */
  public readonly timestamp: Date

  /**
   * La carga útil del evento.
   */
  public readonly payload: ServiceProviderRegisteredPayload

  /**
   * @param {ServiceProviderRegisteredPayload} payload - Los datos del evento.
   */
  constructor (payload: ServiceProviderRegisteredPayload) {
    this.eventId = ulid()
    this.timestamp = new Date()
    this.payload = payload
  }
}
