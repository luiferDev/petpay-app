// src/infrastructure/services/NodemailerService.ts

import { Config } from '../config/env'
import Email from 'email-templates'
import { IEmailService } from '../../application/ports/IEmailService' // Implementa el Port
import { injectable, singleton } from 'tsyringe'
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
@singleton()
export class NodemailerService implements IEmailService {
  private readonly emailClient: Email

  constructor() {
    // 1. Configuración del transportador SMTP (usando las variables de Config)
    const emailService = Config.EMAIL_SERVICE || process.env.EMAIL_SERVICE || 'gmail'
    const emailUser = Config.EMAIL_USER || process.env.EMAIL_USER
    const emailPassword = Config.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD

    console.log('[NodemailerService] Initializing with config:', {
      service: emailService,
      user: emailUser,
      hasPassword: !!emailPassword,
      configService: Config.EMAIL_SERVICE,
      configUser: Config.EMAIL_USER,
      envService: process.env.EMAIL_SERVICE,
      envUser: process.env.EMAIL_USER
    })

    // Build transport options and avoid providing an `auth` object
    // when credentials are missing (that causes "Missing credentials for 'PLAIN'" errors).
    const transportOptions: any = { service: emailService }

    if (emailUser && emailPassword) {
      transportOptions.auth = { user: emailUser, pass: emailPassword }
    } else {
      logger.warn('Nodemailer credentials missing; creating transport without auth. In production set EMAIL_USER and EMAIL_PASSWORD.')
      // Fallback to a non-authenticated transport for dev; use JSON transport so messages are serialized
      // instead of attempting to authenticate with external SMTP and failing with PLAIN.
      transportOptions.transport = undefined
    }

    // If we have credentials use normal transport, otherwise use jsonTransport to avoid auth errors
    const transporter = (emailUser && emailPassword)
      ? nodemailer.createTransport(transportOptions)
      : nodemailer.createTransport({ jsonTransport: true })

    // 2. Inicialización del cliente de plantillas
    // Use __dirname to resolve templates path relative to this file, ensuring it works in Docker/production
    const templatesDir = path.join(__dirname, '../../..', 'templates')
    
    // Verificar si el directorio de templates existe
    const fs = require('fs')
    if (fs.existsSync(templatesDir)) {
      logger.info(`✅ Templates directory exists: ${templatesDir}`)
      const files = fs.readdirSync(templatesDir)
      logger.info(`Templates found: ${JSON.stringify(files)}`)
      
      // Verificar si existe verificationEmail
      const verificationEmailPath = path.join(templatesDir, 'verificationEmail')
      if (fs.existsSync(verificationEmailPath)) {
        const templateFiles = fs.readdirSync(verificationEmailPath)
        logger.info(`verificationEmail template files: ${JSON.stringify(templateFiles)}`)
      } else {
        logger.error(`❌ verificationEmail template NOT found at: ${verificationEmailPath}`)
      }
    } else {
      logger.error(`❌ Templates directory NOT found: ${templatesDir}`)
    }
    
    this.emailClient = new Email({
      message: {
        from: Config.EMAIL_USER || 'noreply@petpay.com'
      },
      send: true,
      transport: transporter,
      views: {
        root: templatesDir, // Ubicación de las plantillas .ejs (relativo a __dirname para Docker)
        options: {
          extension: 'ejs'
        }
      }
    })

    logger.info('✅ Nodemailer service initialized and ready for use.')
  }

  /**
   * {@inheritDoc}
   */
  public async send(
    template: string,
    to: string,
    subject: string,
    locals: Record<string, any> = {}
  ): Promise<{ success: boolean, messageId?: string, error?: any }> {
    try {
      logger.info('Attempting to send email', {
        template,
        to,
        subject,
        locals
      })

      const info = await this.emailClient.send({
        template,
        message: { to, subject },
        locals
      })

      logger.info('Correo enviado exitosamente', {
        to,
        subject,
        template,
        messageId: info.messageId,
        response: info.response
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
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * {@inheritDoc}
   */
  public async sendVerificationEmail(
    to: string,
    firstName: string,
    userId: string
  ): Promise<{ success: boolean, messageId?: string, error?: any }> {
    const verificationLink = `${Config.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email/${userId}`

    return this.send(
      'verificationEmail',
      to,
      'Verifica tu cuenta de Petpay',
      {
        firstName,
        verificationLink
      }
    )
  }
}
