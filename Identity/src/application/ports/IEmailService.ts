// src/application/ports/IEmailService.ts

/**
 * @interface IEmailService
 * @description Port (interfaz) para servicios de envío de correo electrónico.
 * Permite a los casos de uso (p.ej., RegisterUserUseCase) solicitar el envío
 * de emails sin depender de la implementación (Nodemailer, AWS SES, etc.).
 */
export abstract class IEmailService {
  /**
   * Envía un correo electrónico basado en una plantilla (template).
   * @param {string} template - Nombre de la plantilla de correo (ej. 'verificationEmail').
   * @param {string} to - Dirección de correo del destinatario.
   * @param {string} subject - Asunto del correo.
   * @param {Record<string, any>} [locals] - Variables a inyectar en la plantilla (data).
   * @returns {Promise<{success: boolean, messageId?: string, error?: any}>} Resultado de la operación.
   */
  abstract send: (
    template: string,
    to: string,
    subject: string,
    locals?: Record<string, any>
  ) => Promise<{ success: boolean, messageId?: string, error?: any }>

  /**
   * Envía un correo de verificación de email.
   * @param {string} to - Dirección de correo del destinatario.
   * @param {string} firstName - Nombre del usuario para la plantilla.
   * @returns {Promise<{success: boolean, messageId?: string, error?: any}>} Resultado de la operación.
   */
  abstract sendVerificationEmail: (
    to: string,
    firstName: string,
    userId: string
  ) => Promise<{ success: boolean, messageId?: string, error?: any }>

  /**
   * Envía un correo con factura adjunta.
   * @param {string} to - Dirección de correo del destinatario.
   * @param {string} fullName - Nombre completo del destinatario.
   * @param {string} invoiceNumber - Número de factura.
   * @param {string} paymentStatus - Estado del pago (completed, failed, etc.).
   * @param {Buffer} pdfAttachment - Buffer con el contenido del PDF de la factura.
   * @returns {Promise<{success: boolean, messageId?: string, error?: any}>} Resultado de la operación.
   */
  abstract sendInvoice: (
    to: string,
    fullName: string,
    invoiceNumber: string,
    paymentStatus: string,
    pdfAttachment: Buffer
  ) => Promise<{ success: boolean, messageId?: string, error?: any }>
}
