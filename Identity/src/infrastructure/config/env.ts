// src/infrastructure/config/env.ts

import { z } from 'zod';

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
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters").default(process.env.JWT_SECRET || 'petpay-default-secret-fallback'),
  
  /** Tiempo de expiración del Access Token (ej. '15m', '1h') */
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  
  /** Tiempo de expiración del Refresh Token (ej. '7d') */
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // --- CONFIGURACIÓN DE INFRAESTRUCTURA ---
  
  /** Cadena de conexión a PostgreSQL */
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
  
  /** URL de conexión al Message Broker (RabbitMQ) */
  RABBITMQ_URL: z.string().url().min(1, "RABBITMQ_URL is required"),
  
  /** Orígenes permitidos para CORS (separados por coma) */
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  // --- CONFIGURACIÓN DE EMAIL ---

  /** Servicio de Email (ej. 'gmail', 'smtp') */
  EMAIL_SERVICE: z.string().optional(),
  
  /** Usuario de Nodemailer/SMTP */
  EMAIL_USER: z.string().optional(),
  
  /** Contraseña de Nodemailer/SMTP */
  EMAIL_PASSWORD: z.string().optional(),
});

/**
 * @typedef {z.infer<typeof envSchema>} EnvConfig
 * @description Tipo inferido para la configuración de entorno.
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * @constant {EnvConfig} Config
 * @description Objeto de configuración final de la aplicación.
 * Este objeto se valida y se exporta para uso global.
 * @throws {Error} Si alguna variable de entorno requerida no es válida.
 * @author Petpay Architecture Team
 */
export const Config: EnvConfig = envSchema.parse(process.env);