// src/infrastructure/services/NodemailerService.ts

import { Config } from '../config/env'
import Email from 'email-templates'
import { IEmailService } from '../../application/ports/IEmailService' // Implementa el Port
import { injectable } from 'tsyringe'
import { logger } from '../../shared/utils/logger' // Importado de Shared/Utils
import nodemailer from 'nodemailer'
import path from 'path'

// Importado de Infrastructure/Config

/**
 * @class NodemailerService
 * @implements {IEmailService}
 * @description Adaptador de infraestructura para el envío de correos electrónicos
 * utilizando Nodemailer. Cumple el contrato IEmailService.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class NodemailerService implements IEmailService {
  private readonly emailClient: Email

  constructor () {
    // 1. Configuración del transportador SMTP (usando las variables de Config)
    const transporter = nodemailer.createTransport({
      service: Config.EMAIL_SERVICE || 'gmail',
      auth: {
        user: Config.EMAIL_USER,
        pass: Config.EMAIL_PASSWORD // Usamos EMAIL_PASSWORD, alineado con nuestro env.ts
      }
    })

    // 2. Inicialización del cliente de plantillas
    this.emailClient = new Email({
      message: {
        from: Config.EMAIL_USER || 'noreply@petpay.com'
      },
      send: true,
      transport: transporter,
      views: {
        root: path.resolve('templates'), // Ubicación de las plantillas .ejs (desde la raíz del servicio)
        options: {
          extension: 'ejs'
        }
      },
      // Habilitar logging de email en desarrollo
      logger: process.env.NODE_ENV === 'development'
    })

    logger.info('✅ Nodemailer service initialized and ready for use.')
  }

  /**
   * {@inheritDoc}
   */
  public async send (
    template: string,
    to: string,
    subject: string,
    locals: Record<string, any> = {}
  ): Promise<{ success: boolean, messageId?: string, error?: any }> {
    try {
      const info = await this.emailClient.send({
        template,
        message: { to, subject },
        locals
      })

      logger.info('Correo enviado exitosamente', {
        to,
        subject,
        template,
        messageId: info.messageId
      })

      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      logger.error('❌ Error al enviar correo', {
        to,
        subject,
        template,
        error: error instanceof Error ? error.message : String(error)
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
