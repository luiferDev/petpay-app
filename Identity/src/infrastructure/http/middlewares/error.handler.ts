import { type Request, type Response, type NextFunction } from 'express'
import { DomainError } from '../../../domain/errors/DomainError'
import { logger } from '../../../shared/utils/logger'

export function errorHandler (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof DomainError) {
    logger.warn('Domain error handled', {
      path: req.path,
      errorName: err.name,
      suggestedHttpCode: err.suggestedHttpCode,
      message: err.message
    })

    res.status(err.suggestedHttpCode).json({
      status: err.suggestedHttpCode,
      error: err.name,
      message: err.message
    })
    return
  }

  logger.error('Unhandled error', {
    path: req.path,
    error: err.message,
    stack: err.stack
  })

  res.status(500).json({
    status: 500,
    error: 'InternalServerError',
    message: 'An unexpected error occurred'
  })
}
