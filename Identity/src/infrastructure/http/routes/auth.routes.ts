import { Request, Response, Router } from 'express'
import { protect, restrictTo } from '../middlewares/auth.middleware'

import { AuthController } from '../controllers/auth-controller'
import { Db } from '../../database/drizzle/schema'
import { TOKENS } from '../../services/JwtTokenProvider'
import { UserRole } from '../interfaces/IUserRepository'
import { container } from 'tsyringe'
import { createNodemailerTransport } from '../../../../utils/nodemailer'

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
router.post('/login', async (req: Request, res: Response) => await getAuthController().login(req, res))
router.get('/verify/:userId', async (req: Request, res: Response) => await getAuthController().verifyEmail(req, res))
router.post('/register/:role', async (req: Request, res: Response) => await getAuthController().registerByRole(req, res))

router.get('/users', protect, restrictTo([UserRole.ADMIN]), (req: Request, res: Response) => getAuthController().listUsers(req, res))

export default router
