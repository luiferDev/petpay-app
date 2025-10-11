import { Request, Response } from 'express'
import { AuthService } from '../services/register-service'

export class AuthController {
	private authService: AuthService

	constructor({ authService }: { authService: AuthService }) {
		this.authService = authService
	}

	create = async (req: Request, res: Response) => {
		const result = await this.authService.register(req.body)
		return res.status(result.status).json(result)
	}
}