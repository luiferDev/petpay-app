/**
 * @interface IEventPublisher
 * @description Contrato para la publicación de eventos de dominio a un Message Broker (RabbitMQ).
 * Implementado por la capa de Infraestructura (e.g., RabbitMQEventPublisher).
 */
export interface IEventPublisher {
  /**
   * Publica un evento de dominio al broker.
   * @param {string} routingKey - La clave de ruteo del evento (ej. 'user.created').
   * @param {any} event - El objeto de evento de dominio.
   * @returns {Promise<void>}
   */
  publish(routingKey: string, event: any): Promise<void>;
}