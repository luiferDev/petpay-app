// src/infrastructure/config/env.ts
import 'dotenv/config'
import { z } from 'zod'

/**
 * @description Esquema de Zod para la validación de las variables de entorno.
 * Asegura que todas las variables críticas estén presentes y tengan el tipo correcto.
 */
const envSchema = z.object({
  /** Entorno de la aplicación: 'development' | 'production' | 'test' */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /** Puerto en el que correrá el servidor Express */
  PORT: z.coerce.number().default(3001),

  // --- CONFIGURACIÓN DE SEGURIDAD ---

  /** Número de rondas de sal para el hashing de contraseñas (bcrypt) */
  SALT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  /** Secreto simétrico para firmar y verificar JWTs */
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters').default(process.env.JWT_SECRET ?? 'petpay-default-secret-fallback'),

  /** Tiempo de expiración del Access Token (ej. '15m', '1h') */
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),

  /** Tiempo de expiración del Refresh Token (ej. '7d') */
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // --- CONFIGURACIÓN DE INFRAESTRUCTURA ---

  /** Cadena de conexión a PostgreSQL */
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  /** URL de conexión al Message Broker (RabbitMQ) */
  RABBITMQ_URL: z.string().url().min(1, 'RABBITMQ_URL is required'),

  /** Orígenes permitidos para CORS (separados por coma) */
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  // --- CONFIGURACIÓN DE EMAIL ---

  /** Servicio de Email (ej. 'gmail', 'smtp') */
  EMAIL_SERVICE: z.string().optional(),

  /** Usuario de Nodemailer/SMTP */
  EMAIL_USER: z.string().optional(),

  /** Contraseña de Nodemailer/SMTP */
  EMAIL_PASSWORD: z.string().optional(),

  /** URL del frontend para links de verificación */
  FRONTEND_URL: z.string().url().optional().default('http://localhost:3000'),

  // --- CONFIGURACIÓN DE OAUTH ---

  /** Habilitar OAuth (feature flag) */
  ENABLE_OAUTH: z.boolean().default(false),

  /** Google OAuth Client ID */
  GOOGLE_CLIENT_ID: z.string().optional(),

  /** Google OAuth Client Secret */
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /** Google OAuth Callback URL */
  GOOGLE_CALLBACK_URL: z.string().optional(),

  /** GitHub OAuth Client ID */
  GITHUB_CLIENT_ID: z.string().optional(),

  /** GitHub OAuth Client Secret */
  GITHUB_CLIENT_SECRET: z.string().optional(),

  /** GitHub OAuth Callback URL */
  GITHUB_CALLBACK_URL: z.string().optional(),

  /** Secreto para encriptar el state parameter de OAuth (mínimo 32 caracteres) */
  OAUTH_STATE_SECRET: z.string().min(32, 'OAUTH_STATE_SECRET must be at least 32 characters'),

  // --- CONFIGURACIÓN DE RATE LIMITING ---

  /** Habilitar rate limiting */
  RATE_LIMIT_ENABLED: z.boolean().default(true),

  /** Max requests para endpoints de autenticación */
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),

  /** Ventana de tiempo para auth (en ms) */
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(900000),

  /** Max requests para endpoints de OAuth */
  RATE_LIMIT_OAUTH_MAX: z.coerce.number().default(5),

  /** Ventana de tiempo para OAuth (en ms) */
  RATE_LIMIT_OAUTH_WINDOW_MS: z.coerce.number().default(900000),

  /** Max requests para endpoints generales */
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().default(100),

  /** Ventana de tiempo para endpoints generales (en ms) */
  RATE_LIMIT_GENERAL_WINDOW_MS: z.coerce.number().default(60000),

  // --- CONFIGURACIÓN DE CONCURRENCY ---

  /** Número máximo de reintentos para transacciones con SERIALIZABLE isolation */
  CONCURRENCY_MAX_RETRIES: z.coerce.number().default(3),

  /** Retraso inicial en milisegundos entre reintentos */
  CONCURRENCY_RETRY_DELAY_MS: z.coerce.number().default(100),

  /** Factor de backoff exponencial para reintentos */
  CONCURRENCY_BACKOFF_FACTOR: z.coerce.number().default(2),

  /** Timeout en milisegundos para adquisición de advisory locks */
  ADVISORY_LOCK_TIMEOUT_MS: z.coerce.number().default(5000),

  /** Tamaño máximo del pool de conexiones */
  POOL_MAX_SIZE: z.coerce.number().default(20),

  // --- CONFIGURACIÓN DE REDIS ---

  /** URL de conexión a Redis para refresh tokens */
  REDIS_URL: z.string().optional(),

  /** Host de Redis (si no se usa REDIS_URL) */
  REDIS_HOST: z.string().default('localhost'),

  /** Puerto de Redis */
  REDIS_PORT: z.coerce.number().default(6379),

  /** Password de Redis (opcional) */
  REDIS_PASSWORD: z.string().optional(),

  /** Número de base de datos de Redis */
  REDIS_DB: z.coerce.number().default(0)
})

/**
 * @typedef {z.infer<typeof envSchema>} EnvConfig
 * @description Tipo inferido para la configuración de entorno.
 */
export type EnvConfig = z.infer<typeof envSchema>

/**
 * @constant {EnvConfig} Config
 * @description Objeto de configuración final de la aplicación.
 * Este objeto se valida y se exporta para uso global.
 * @throws {Error} Si alguna variable de entorno requerida no es válida.
 * @author Petpay Architecture Team
 */
export const Config: EnvConfig = envSchema.parse(process.env)

/**
 * @function isOAuthEnabled
 * @description Verifica si OAuth está habilitado y configurado correctamente.
 * @returns {boolean} True si OAuth está habilitado y todas las variables requeridas están presentes.
 */
export function isOAuthEnabled (): boolean {
  if (!Config.ENABLE_OAUTH) {
    return false
  }

  const hasGoogle = Config.GOOGLE_CLIENT_ID !== undefined && Config.GOOGLE_CLIENT_SECRET !== undefined && Config.GOOGLE_CALLBACK_URL !== undefined
  const hasGitHub = Config.GITHUB_CLIENT_ID !== undefined && Config.GITHUB_CLIENT_SECRET !== undefined && Config.GITHUB_CALLBACK_URL !== undefined
  const hasStateSecret = Config.OAUTH_STATE_SECRET !== undefined && Config.OAUTH_STATE_SECRET.length >= 32

  return (hasGoogle || hasGitHub) && hasStateSecret
}

/**
 * @function isProviderConfigured
 * @description Verifica si un proveedor OAuth específico está configurado.
 * @param {'google' | 'github'} provider - El proveedor a verificar.
 * @returns {boolean} True si el proveedor está configurado.
 */
export function isProviderConfigured (provider: 'google' | 'github'): boolean {
  if (!isOAuthEnabled()) {
    return false
  }

  switch (provider) {
    case 'google':
      return Config.GOOGLE_CLIENT_ID !== undefined && Config.GOOGLE_CLIENT_SECRET !== undefined && Config.GOOGLE_CALLBACK_URL !== undefined
    case 'github':
      return Config.GITHUB_CLIENT_ID !== undefined && Config.GITHUB_CLIENT_SECRET !== undefined && Config.GITHUB_CALLBACK_URL !== undefined
    default:
      return false
  }
}

/**
 * @function isRateLimitEnabled
 * @description Verifica si el rate limiting está habilitado.
 * @returns {boolean} True si el rate limiting está habilitado.
 */
export function isRateLimitEnabled (): boolean {
  return Config.RATE_LIMIT_ENABLED
}
