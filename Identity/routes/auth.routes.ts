import { Router, Request, Response } from 'express'
import { AuthController } from '../controllers/auth-controller'
import { AuthService } from '../services/auth-service'
import { EmailService } from '../services/EmailService'
import { Db } from '../model/schema'
import { createNodemailerTransport } from '../utils/nodemailer'
import { DrizzleUserRepository } from '../model/drizzle.user.repository'


const router = Router()

// Crear dependencias manualmente
const userRepository = new DrizzleUserRepository(Db)
const emailTransport = createNodemailerTransport()
const emailService = new EmailService(emailTransport)
const authService = new AuthService(userRepository, emailService)
const authController = new AuthController(authService)

router.post('/register', (req: Request, res: Response) => authController.createClient(req, res))
router.post('/login', (req: Request, res: Response) => authController.login(req, res))
router.get('/users', (req: Request, res: Response) => authController.listUsers(req, res))
router.get('/verify/:userId', (req: Request, res: Response) => authController.verifyEmail(req, res))
router.post('/register/:role', (req: Request, res: Response) => authController.registerByRole(req, res))

export default router
