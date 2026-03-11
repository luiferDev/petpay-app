import { Request, Response, Router, type RequestHandler } from 'express'
import { OAuthController } from '../controllers/OAuthController'
import { protect } from '../middlewares/auth.middleware'
import { container } from 'tsyringe'

const router = Router()

// Initialize controller via DI container
const getOAuthController = (): OAuthController => container.resolve(OAuthController)

// GET /auth/oauth/:provider/initiate - Start OAuth flow
router.get('/:provider/initiate', ((req: Request, res: Response): void => {
  void getOAuthController().initiate(req, res)
}) as RequestHandler)

// GET /auth/oauth/:provider/callback - OAuth callback
router.get('/:provider/callback', ((req: Request, res: Response): void => {
  void getOAuthController().callback(req, res)
}) as RequestHandler)

// POST /auth/oauth/:provider/link - Link OAuth provider to authenticated user
router.post('/:provider/link', protect, ((req: Request, res: Response): void => {
  void getOAuthController().linkProvider(req, res)
}) as RequestHandler)

export default router
