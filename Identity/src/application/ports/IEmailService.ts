// src/application/ports/IEmailService.ts

/**
 * @interface IEmailService
 * @description Port (interfaz) para servicios de envío de correo electrónico.
 * Permite a los casos de uso (p.ej., RegisterUserUseCase) solicitar el envío
 * de emails sin depender de la implementación (Nodemailer, AWS SES, etc.).
 */
export interface IEmailService {
  /**
   * Envía un correo electrónico basado en una plantilla (template).
   * @param {string} template - Nombre de la plantilla de correo (ej. 'verificationEmail').
   * @param {string} to - Dirección de correo del destinatario.
   * @param {string} subject - Asunto del correo.
   * @param {Record<string, any>} [locals] - Variables a inyectar en la plantilla (data).
   * @returns {Promise<{success: boolean, messageId?: string, error?: any}>} Resultado de la operación.
   */
  send: (
    template: string,
    to: string,
    subject: string,
    locals?: Record<string, any>
  ) => Promise<{ success: boolean, messageId?: string, error?: any }>

  /**
   * Envía un correo de verificación de email.
   * @param {string} to - Dirección de correo del destinatario.
   * @param {string} firstName - Nombre del usuario para la plantilla.
   * @param {string} verificationToken - Token de verificación.
   * @returns {Promise<{success: boolean, messageId?: string, error?: any}>} Resultado de la operación.
   */
  sendVerificationEmail: (
    to: string,
    firstName: string,
    userId: string
  ) => Promise<{ success: boolean, messageId?: string, error?: any }>
}
