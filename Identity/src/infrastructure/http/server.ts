import 'reflect-metadata'
import express from 'express'
import { corsMiddleware } from './middlewares/cors'
import cookieParser from 'cookie-parser'
import { Config } from '../config/env'
import path from 'path'
import 'dotenv/config'
import authRouter from './routes/auth.routes'
// import oauthRouter from './routes/oauth.routes'
import { authRateLimiter, generalRateLimiter } from './middlewares/rate-limiter'
import { setupDI } from '../DI/container'

// Simple logger fallback
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
}

// Setup Dependency Injection
setupDI()

// 1. Inicializar la aplicación Express
const app = express()

// Middlewares
app.use(express.json())
app.disable('x-powered-by')
app.use(corsMiddleware())
app.use(cookieParser())
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))

app.get('/', generalRateLimiter, (req, res) => {
  res.send('¡Hola desde Express y Bun! 🚀')
})

// Health check endpoint
app.get('/health', generalRateLimiter, (req, res) => {
  res.json({ status: 'healthy', service: 'identity' })
})

// Rutas de autenticación con rate limiting
app.use('/auth', authRateLimiter, authRouter)

// OAuth routes temporarily disabled for debugging
// app.use('/auth/oauth', oauthRateLimiter, oauthRouter)

// Iniciar el servidor
app.listen(Config.PORT, () => {
  logger.info(`Servidor Express corriendo en http://localhost:${Config.PORT}`)
})
