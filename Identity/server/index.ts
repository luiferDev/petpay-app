import express, { type Request, type Response } from 'express'
import { corsMiddleware } from '../middlewares/cors'
import { PORT } from '../lib/config'
import 'dotenv/config'
import router from '../routes/auth.routes'

// 1. Inicializar la aplicación Express
const app = express()

// Middlewares
app.use(express.json())
app.disable('x-powered-by')
app.use(corsMiddleware())

app.get('/', (req: Request, res: Response) => {
  res.send('¡Hola desde Express y Bun! 🚀')
})

app.use('/auth', router)

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`)
})
