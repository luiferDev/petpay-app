import 'reflect-metadata'
import express, { type Request, type Response } from 'express'
import { corsMiddleware } from '../middlewares/cors'
import cookieParser from 'cookie-parser'
import { PORT } from '../lib/config'
import { logger } from '../lib/logger'
import path from 'path'
import 'dotenv/config'
import router from '../routes/auth.routes'


// 1. Inicializar la aplicación Express
const app = express()

// Middlewares
app.use(express.json())
app.disable('x-powered-by')
app.use(corsMiddleware())
app.use(cookieParser())
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'))

app.get('/', (req: Request, res: Response) => {
  res.send('¡Hola desde Express y Bun! 🚀')
})

// Rutas de autenticación
app.use('/auth', router)

// Iniciar el servidor
app.listen(PORT, () => {
  logger.info(`Servidor Express corriendo en http://localhost:${PORT}`)
})
