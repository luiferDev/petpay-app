import 'reflect-metadata'
import express from 'express'
import { corsMiddleware } from './middlewares/cors'
import cookieParser from 'cookie-parser'
import { Config } from '../config/env'
import path from 'path'
import 'dotenv/config'
import authRouter from './routes/auth.routes'
import emailRouter from './routes/email.routes'
// import oauthRouter from './routes/oauth.routes'
import { authRateLimiter, generalRateLimiter } from './middlewares/rate-limiter'
import { setupDI } from '../DI/container'
import { RabbitMQEventConsumer } from '../messaging/RabbitMQEventConsumer'

// Simple logger fallback
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`)
}

// Start RabbitMQ consumer (non-blocking)
const consumer = new RabbitMQEventConsumer()
consumer.start().catch(err => logger.error('Failed to start RMQ consumer', err))

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

// Health check endpoint (también disponible en /api/v1/health para consistencia)
app.get('/health', generalRateLimiter, (req, res) => {
  res.json({ status: 'healthy', service: 'identity' })
})

app.get('/api/v1/health', generalRateLimiter, (req, res) => {
  res.json({ status: 'healthy', service: 'identity' })
})

// Rutas de autenticación con rate limiting (con prefijo /api/v1)
app.use('/api/v1/auth', authRateLimiter, authRouter)

// Rutas de email (servicio a servicio, sin rate limiting)
app.use('/api/v1/emails', emailRouter)

// OAuth routes temporarily disabled for debugging
// app.use('/auth/oauth', oauthRateLimiter, oauthRouter)

// Iniciar el servidor
app.listen(Config.PORT, () => {
  logger.info(`Servidor Express corriendo en http://localhost:${Config.PORT}`)
})
