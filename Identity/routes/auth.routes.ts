import { Router } from 'express'
import { AuthController } from '../controllers/auth-controller'
import { AuthService } from '../services/auth-service'
import { UserRepository } from '../model/user-repository'

const router = Router()
const authService = new AuthService({ authRepository: UserRepository })
const authController = new AuthController({ authService })

router.post('/register', authController.createClient)
router.post('/login', authController.login)
router.get('/users', authController.listUsers)
router.get('/verify/:userId', authController.verifyEmail)
router.post('/register/:role', authController.registerByRole)

export default router
