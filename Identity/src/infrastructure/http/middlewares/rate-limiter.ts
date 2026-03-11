import rateLimit, { type RateLimitRequestHandler, ipKeyGenerator } from 'express-rate-limit'
import { Config, isRateLimitEnabled } from '../../config/env'

/**
 * @interface RateLimiterOptions
 * @description Opciones para configurar el rate limiter.
 */
interface RateLimiterOptions {
  windowMs: number
  max: number
  message?: string
}

/**
 * @function createRateLimiter
 * @description Crea un middleware de rate limiting con las opciones dadas.
 * @param {RateLimiterOptions} options - Configuración para el rate limiter
 * @returns {RateLimitRequestHandler} Middleware de Express para rate limiting
 */
export function createRateLimiter (options: RateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message ?? 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    skip: () => !isRateLimitEnabled()
  })
}

// Pre-configured rate limiters

/**
 * @constant authRateLimiter
 * @description Rate limiter para endpoints de autenticación.
 * Límite: 10 solicitudes por 15 minutos.
 */
export const authRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: Config.RATE_LIMIT_AUTH_WINDOW_MS,
  max: Config.RATE_LIMIT_AUTH_MAX,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
})

/**
 * @constant oauthRateLimiter
 * @description Rate limiter para endpoints de OAuth.
 * Límite: 5 solicitudes por 15 minutos.
 */
export const oauthRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: Config.RATE_LIMIT_OAUTH_WINDOW_MS,
  max: Config.RATE_LIMIT_OAUTH_MAX,
  message: 'Too many OAuth attempts from this IP, please try again after 15 minutes'
})

/**
 * @constant generalRateLimiter
 * @description Rate limiter para endpoints generales.
 * Límite: 100 solicitudes por minuto.
 */
export const generalRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: Config.RATE_LIMIT_GENERAL_WINDOW_MS,
  max: Config.RATE_LIMIT_GENERAL_MAX,
  message: 'Too many requests from this IP, please try again after a minute'
})
