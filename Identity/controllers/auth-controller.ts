import { Request, Response } from 'express'
import { AuthService } from '../services/auth-service'
import { logger } from '../lib/logger'

export class AuthController {
  private readonly authService: AuthService

  constructor({ authService }: { authService: AuthService }) {
    this.authService = authService
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.authService.register(req.body)
    return res.status(result.status).json(result)
  }

  login = async (req: Request, res: Response): Promise<Response> => {
    logger.info('Login attempt', { email: req.body?.email })
    const result = await this.authService.login(req.body)
    logger.info('Login result', { status: result.status, message: result.message })
    return res.status(result.status).json(result)
  }

  listUsers = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.authService.listUsers()
    return res.status(200).json(result)
  }
}
