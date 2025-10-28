import { Router } from 'express'
import { AuthController } from '../controllers/auth-controller'
import { DIContainer } from '../container/DIContainer'

const router = Router()
const container = DIContainer.getInstance()
const authController = container.get<AuthController>('AuthController')

router.post('/register', authController.createClient)
router.post('/login', authController.login)
router.get('/users', authController.listUsers)
router.get('/verify/:userId', authController.verifyEmail)
router.post('/register/:role', authController.registerByRole)

export default router
