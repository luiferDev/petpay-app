import { Request, Response, Router } from 'express'
import { OAuthController } from '../controllers/OAuthController'
import { protect } from '../middlewares/auth.middleware'
import { container } from 'tsyringe'

const router = Router()

// Initialize controller via DI container
const getOAuthController = () => container.resolve(OAuthController)

// GET /auth/oauth/:provider/initiate - Start OAuth flow
router.get('/:provider/initiate', (req: Request, res: Response) => {
  getOAuthController().initiate(req, res)
})

// GET /auth/oauth/:provider/callback - OAuth callback
router.get('/:provider/callback', (req: Request, res: Response) => {
  getOAuthController().callback(req, res)
})

// POST /auth/oauth/:provider/link - Link OAuth provider to authenticated user
router.post('/:provider/link', protect, (req: Request, res: Response) => {
  getOAuthController().linkProvider(req, res)
})

export default router
