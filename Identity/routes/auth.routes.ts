import { Router, Request, Response } from 'express'
import { AuthController } from '../controllers/auth-controller'
import { container } from 'tsyringe'
import { TOKENS } from '../lib/tokens'
import { Db } from '../model/schema'
import { createNodemailerTransport } from '../utils/nodemailer'
import { protect, restrictTo } from '../middlewares/protected.routes'
import { UserRole } from '../interfaces/IUserRepository'

// Register database in DI container
container.registerInstance(TOKENS.Database, Db)
container.registerInstance(TOKENS.Transport, createNodemailerTransport())


const router = Router()

// Función de utilidad para obtener el controlador.
// Esto asegura que la llamada a container.resolve() solo ocurra
// después de que el archivo index.ts haya terminado de ejecutarse
// y registrado todas las dependencias (como TOKENS.Database).
const getAuthController = () => container.resolve(AuthController)

// Ahora, todas las rutas usan la función getAuthController()
// para obtener una instancia *justo a tiempo*.
router.post('/register', (req: Request, res: Response) => getAuthController().createClient(req, res))
router.post('/login', (req: Request, res: Response) => getAuthController().login(req, res))
router.get('/verify/:userId', (req: Request, res: Response) => getAuthController().verifyEmail(req, res))
router.post('/register/:role', (req: Request, res: Response) => getAuthController().registerByRole(req, res))

router.get('/users', protect, restrictTo([UserRole.ADMIN]), (req: Request, res: Response) => getAuthController().listUsers(req, res))

export default router
