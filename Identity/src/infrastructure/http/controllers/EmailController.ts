// src/infrastructure/http/controllers/EmailController.ts

import { injectable } from 'tsyringe'
import { Request, Response } from 'express'
import { logger } from '../../../shared/utils/logger'
import { IEmailService } from '../../../application/ports/IEmailService'

interface EmailRequestBody {
  to?: string
  template?: string
  subject?: string
  fullName?: string
  invoiceNumber?: string
  paymentStatus?: string
  attachment?: string
  [key: string]: unknown
}

/**
 * @class EmailController
 * @description Adaptador de presentación que gestiona las peticiones HTTP
 * para el envío de correos electrónicos.
 * @author Petpay Architecture Team
 * @version 1.0
 */
@injectable()
export class EmailController {
  constructor (
    private readonly emailService: IEmailService
  ) { }

  /**
   * Endpoint POST /api/v1/emails/send
   * Envía un correo electrónico con opcional adjunto.
   * Soporta envío de facturas con PDF adjunto.
   */
  send = async (req: Request, res: Response): Promise<Response> => {
    try {
      const body = req.body as EmailRequestBody
      const { to, template, subject, fullName, invoiceNumber, paymentStatus, attachment } = body

      // Validate required fields
      if (to === undefined || to === null || to === '') {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing required field: to'
        })
      }

      // Handle invoice sending with PDF attachment
      if (template === 'invoice' && invoiceNumber !== undefined && paymentStatus !== undefined && attachment !== undefined) {
        // Decode base64 attachment
        const pdfBuffer = Buffer.from(attachment, 'base64')

        const result = await this.emailService.sendInvoice(
          to,
          fullName ?? 'Customer',
          invoiceNumber,
          paymentStatus,
          pdfBuffer
        )

        if (result.success) {
          logger.info('Invoice email sent successfully', {
            to,
            invoiceNumber,
            messageId: result.messageId
          })

          return res.status(200).json({
            success: true,
            messageId: result.messageId
          })
        } else {
          logger.error('Failed to send invoice email', {
            to,
            invoiceNumber,
            error: result.error
          })

          return res.status(500).json({
            error: 'EmailSendFailed',
            message: result.error
          })
        }
      }

      // Handle general email sending
      const locals: Record<string, unknown> = { ...body }
      delete locals.to
      delete locals.template
      delete locals.subject

      const result = await this.emailService.send(
        template ?? 'generic',
        to,
        subject ?? 'Notification',
        locals
      )

      if (result.success) {
        logger.info('Email sent successfully', {
          to,
          template,
          subject
        })

        return res.status(200).json({
          success: true,
          messageId: result.messageId
        })
      } else {
        logger.error('Failed to send email', {
          to,
          template,
          subject,
          error: result.error
        })

        return res.status(500).json({
          error: 'EmailSendFailed',
          message: result.error
        })
      }
    } catch (error) {
      logger.error('Error in EmailController.send', {
        error: error instanceof Error ? error.message : String(error)
      })

      return res.status(500).json({
        error: 'InternalServerError',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
