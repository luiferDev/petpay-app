import { Router } from 'express'
import { AuthController } from '../controllers/auth-controller'
import { AuthService } from '../services/register-service'
import { UserRepository } from '../model/user-repository'

const router = Router()
const authService = new AuthService({ authRepository: UserRepository })
const authController = new AuthController({ authService })

router.post('/register', authController.create)

export default router
