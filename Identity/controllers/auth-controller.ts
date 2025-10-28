import { Request, Response } from 'express'
import { logger } from '../lib/logger'
import { Role } from '../template-method/register.template'
import { IAuthService } from '../interfaces/IAuthService'

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  createClient = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.authService.registerClient(req.body)
    return res.status(result.status).json(result)
  }

  registerByRole = async (req: Request, res: Response): Promise<Response> => {
    const { role } = req.params
    
    if (!role) {
      return res.status(400).json({ status: 400, message: 'Rol es requerido' })
    }

    const normalizedRole = role.toUpperCase()
    const validRoles = Object.values(Role)
    
    if (!validRoles.includes(normalizedRole as Role)) {
      return res.status(400).json({ 
        status: 400, 
        message: `Rol no válido. Roles permitidos: ${validRoles.join(', ')}` 
      })
    }

    logger.info('Registrando usuario', { role: normalizedRole })
    
    let result
    if (normalizedRole === Role.SERVICE_PROVIDER) {
      result = await this.authService.registerServiceProvider(req.body, normalizedRole)
    } else if (normalizedRole === Role.ADMIN) {
      result = await this.authService.registerAdmin(req.body, normalizedRole)
    } else {
      return res.status(400).json({ status: 400, message: 'Rol no soportado' })
    }
    
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
