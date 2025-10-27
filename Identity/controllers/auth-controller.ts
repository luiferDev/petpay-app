import { Request, Response } from 'express'
import { AuthService } from '../services/auth-service'
import { logger } from '../lib/logger'

export class AuthController {
  private readonly authService: AuthService

  constructor({ authService }: { authService: AuthService }) {
    this.authService = authService
  }

  createClient = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.authService.registerClient(req.body)
    return res.status(result.status).json(result)
  }

  login = async (req: Request, res: Response): Promise<Response> => {
    logger.info('Login attempt', { email: req.body?.email })
    const result = await this.authService.login(req.body)
    logger.info('Login result', { status: result.status, message: result.message })
    if (result.token) {
      res.cookie('access_token', result.token, { httpOnly: true })
    }

    return res.status(result.status).json(result)
  }

  listUsers = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.authService.listUsers()
    return res.status(200).json(result)
  }

  verifyEmail = async (req: Request, res: Response) => {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).render('verifySuccess', {
        success: false,
        message: 'userId es requerido'
      })
    }

    const result = await this.authService.verifyEmail(userId)
    const success = result.status === 200

    return res.status(result.status).render('verifySuccess', {
      success,
      message: result.message
    })
  }
}
