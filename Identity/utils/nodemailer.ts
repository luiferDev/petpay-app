import nodemailer from 'nodemailer'
import Email from 'email-templates'
import path from 'path'
import { logger } from '../lib/logger'

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

export const sendVerificationEmail = async (
  to: string,
  firstName: string,
  verificationLink: string
) => {
  try {
    const info = await email.send({
      template: 'verificationEmail',
      message: {
        to,
        subject: 'Verificación de Correo Electrónico'
      },
      locals: {
        firstName,
        verificationLink
      }
    })

    logger.info('Correo enviado exitosamente', { to, messageId: info.messageId })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    logger.error('Error al enviar correo', { to, error: error instanceof Error ? error.message : error })
    return { success: false, error }
  }
}

// sendVerificationEmail('luifer991@protonmail.com', 'Jorge', 'https://example.com/verify')
//   .then(result => {
//     logger.info('Correo enviado:', result)
//   })
//   .catch(error => {
//     logger.error('Error al enviar correo:', error)
//   })
