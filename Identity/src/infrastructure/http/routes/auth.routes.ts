import { Router } from 'express'
import { protect, restrictTo } from '../middlewares/auth.middleware'

import { AuthController } from '../controllers/auth-controller'
import { UserRole } from '../../../domain/types/Role'
import { container } from 'tsyringe'

const router = Router()

// Función de utilidad para obtener el controlador.
const getAuthController = () => container.resolve(AuthController)

// Rutas
router.post('/register', async (req, res) => await getAuthController().register(req, res))
router.post('/login', async (req, res) => await getAuthController().login(req, res))
router.get('/verify-email/:userId', async (req, res) => await getAuthController().verifyEmail(req, res))
router.post('/register/:role', async (req, res) => await getAuthController().registerByRole(req, res))

router.get('/users', protect, restrictTo([UserRole.ADMIN]), async (req, res) => await getAuthController().listUsers(req, res))

export default router
