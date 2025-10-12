import express, { type NextFunction, type Request, type Response } from 'express'
// ⚠️ RUTAS CORREGIDAS
import { corsMiddleware } from '../src/infrastructure/shared/middlewares/cors'
import { PORT } from '../lib/config'
import 'dotenv/config'
// ⚠️ El router ahora es una función, no un objeto
import authRouter from '../src/infrastructure/web/routes/routes'
import expressWinston from 'express-winston'

// ----------------------------------------------------
// 📌 ENSAMBLAJE DE DEPENDENCIAS (Arquitectura Hexagonal)
// ----------------------------------------------------
import { DrizzleUserRepository } from '../src/infrastructure/persistence/user.adapter' // Implementación Drizzle
import { RegistrationService } from '../src/core/application/registration.service' // Caso de Uso
import { getDatabase } from '../src/infrastructure/shared/db.config' // Conexión DB
import { logger } from '../src/infrastructure/shared/logger'

// **PASO 1:** Inicializar la conexión a la DB y asegurar que está lista.
// Esto ejecuta getDatabase, que crea el Pool y la instancia de Drizzle.
// Si la DB está caída o la URL es mala, el proceso podría fallar aquí.
getDatabase()

// **PASO 2:** Crear el Adaptador de Persistencia (Adaptador Drizzle).
const userRepositoryAdapter = new DrizzleUserRepository()

// **PASO 3:** Crear el Servicio (Núcleo) inyectando el Adaptador (el Puerto).
const registrationService = new RegistrationService(userRepositoryAdapter)
// ----------------------------------------------------

// 1. Inicializar la aplicación Express
const app = express()

// Middlewares
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`)
  next()
})

// Middleware de Logs para peticiones entrantes
app.use(expressWinston.logger({
  winstonInstance: logger,
  msg: 'HTTP {{req.method}} {{req.url}}', // Mensaje que se mostrará
  expressFormat: true, // Usa el formato estándar de Express
  colorize: false, // Desactiva la coloración para logs en archivos
  ignoreRoute: (req, res) => { return req.url === '/' } // Ignora la ruta raíz
}))

app.use(express.json())
app.disable('x-powered-by')
app.use(corsMiddleware())

app.get('/', (req: Request, res: Response) => {
  logger.log('debug', 'Hello, World!') // debug level as first param
  logger.debug("The is the home '/' route.")
  res.send('¡Hola desde Express y Bun! 🚀')
})

// ⚠️ Usar el router como FUNCIÓN e inyectar el servicio.

app.use('/auth', authRouter(registrationService))

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`)
})

// Middleware de Logs para errores (¡Importante, debe ir al final!)
app.use(expressWinston.errorLogger({
  winstonInstance: logger
}))
