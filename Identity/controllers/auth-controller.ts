import { Request, Response } from 'express'
import { AuthService } from '../services/register-service'

export class AuthController {
  private readonly authService: AuthService

  constructor ({ authService }: { authService: AuthService }) {
    this.authService = authService
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.authService.register(req.body)
    return res.status(result.status).json(result)
  }
}
