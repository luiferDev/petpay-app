import nodemailer from 'nodemailer'
import Email from 'email-templates'
import path from 'path'
import { logger } from '../lib/logger'

export type EmailTransport = {
  send(template: string, to: string, subject: string, locals?: Record<string, any>): Promise<any>
}

export const createNodemailerTransport = (): EmailTransport => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  })

  const email = new Email({
    message: {
      from: process.env.EMAIL_USER
    },
    send: true,
    transport: transporter,
    views: {
      root: path.resolve('./templates'),
      options: {
        extension: 'ejs'
      }
    }
  })

  return {
    send: async (template: string, to: string, subject: string, locals = {}) => {
      try {
        const info = await email.send({
          template,
          message: { to, subject },
          locals
        })
        logger.info('Correo enviado exitosamente', { to, messageId: info.messageId })
        return { success: true, messageId: info.messageId }
      } catch (error) {
        logger.error('Error al enviar correo', { to, error: error instanceof Error ? error.message : error })
        return { success: false, error }
      }
    }
  }
}

