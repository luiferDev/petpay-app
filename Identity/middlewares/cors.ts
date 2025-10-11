import cors from 'cors'
import { type RequestHandler } from 'express'

const ACCEPTED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173'
]

export const corsMiddleware = ({ acceptedOrigins = ACCEPTED_ORIGINS } = {}): RequestHandler => cors({
  origin: (origin, callback) => {
    if (acceptedOrigins.includes(origin ?? 'http://localhost:5173')) {
      return callback(null, true)
    }

    if (origin === undefined) {
      return callback(null, true)
    }

    return callback(new Error('Not allowed by CORS'))
  }
})
