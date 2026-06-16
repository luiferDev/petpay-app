// src/infrastructure/http/routes/email.routes.ts

import { Router, Request, Response, NextFunction } from 'express'
import { container } from 'tsyringe'
import { EmailController } from '../controllers/EmailController'
import { logger } from '../../../shared/utils/logger'

const router = Router()

// Get email controller from container
const getEmailController = (): EmailController => {
  return container.resolve(EmailController)
}

// Middleware to check API key for service-to-service communication
const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  const apiKey = authHeader?.replace('Bearer ', '') ?? ''
  const expectedApiKey = process.env.PAYMENTS_SERVICE_API_KEY

  // Skip auth if no API key configured (development)
  if (expectedApiKey === undefined || expectedApiKey === '') {
    logger.warn('PAYMENTS_SERVICE_API_KEY not configured - skipping API key validation')
    return next()
  }

  if (apiKey === '' || apiKey !== expectedApiKey) {
    logger.warn('Invalid or missing API key for email endpoint', {
      hasApiKey: apiKey !== '',
      path: req.path
    })
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    })
  }

  return next()
}

// POST /api/v1/emails/send
router.post('/send', apiKeyAuth, async (req: Request, res: Response): Promise<Response> => {
  const controller = getEmailController()
  return await controller.send(req, res)
})

export default router
