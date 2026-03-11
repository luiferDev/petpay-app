// src/infrastructure/database/drizzle/client.ts

import 'dotenv/config'

import * as schema from './schema' // Importamos el esquema de la misma carpeta

import { Pool, PoolConfig } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { logger } from '../../../shared/utils/logger'

/**
 * @typedef {ReturnType<typeof makeDatabaseClient>} DbClient
 * @description Alias de tipo para el cliente Drizzle con el esquema inyectado.
 */
export type DbClient = ReturnType<typeof makeDatabaseClient>

/**
 * @function getPoolConfig
 * @description Obtiene la configuración del pool de conexiones desde variables de entorno.
 * @returns {PoolConfig} Configuración del pool.
 */
function getPoolConfig (): PoolConfig {
  const maxSize = parseInt(process.env.POOL_MAX_SIZE ?? '20', 10)

  // Adjust pool size based on environment for optimal performance
  const adjustedMax = process.env.NODE_ENV === 'production' ? Math.min(maxSize, 100) : Math.min(maxSize, 20)

  return {
    max: adjustedMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
}

/**
 * @function makeDatabaseClient
 * @description Inicializa y retorna el cliente Drizzle ORM conectado a PostgreSQL.
 * Utiliza un Pool de conexiones (pg) para manejo eficiente de recursos.
 * @returns Cliente Drizzle ORM.
 */
export function makeDatabaseClient (): any {
  const connectionString = process.env.DATABASE_URL
  if (connectionString == null || connectionString === '') {
    // ⚠️ CONSIDERACIÓN DE SEGURIDAD: Nunca exponer la cadena de conexión real.
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const poolConfig = getPoolConfig()

  logger.info('Initializing database connection pool', {
    maxPoolSize: poolConfig.max,
    idleTimeout: poolConfig.idleTimeoutMillis,
    connectionTimeout: poolConfig.connectionTimeoutMillis,
    environment: process.env.NODE_ENV
  })

  const pool = new Pool({
    connectionString,
    ...poolConfig
  })

  // Pool monitoring
  pool.on('error', (err) => {
    logger.error('Database pool error', { error: err.message })
  })

  pool.on('connect', () => {
    logger.debug('Database connection established')
  })

  // Retorna el cliente Drizzle con el esquema cargado
  return drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' })
}

let dbInstance: DbClient | null = null
let poolInstance: Pool | null = null

/**
 * @function getDb
 * @description Singleton para obtener la única instancia del cliente Drizzle.
 * @returns {DbClient} Instancia del cliente Drizzle.
 */
export const getDb = (): DbClient => {
  if (dbInstance === null) {
    const connectionString = process.env.DATABASE_URL
    if (connectionString == null || connectionString === '') {
      throw new Error('DATABASE_URL environment variable is not set in getDb')
    }

    const poolConfig = getPoolConfig()

    logger.info('Initializing singleton database connection pool', {
      maxPoolSize: poolConfig.max,
      idleTimeout: poolConfig.idleTimeoutMillis,
      connectionTimeout: poolConfig.connectionTimeoutMillis,
      environment: process.env.NODE_ENV
    })

    poolInstance = new Pool({
      connectionString,
      ...poolConfig
    })

    // Pool monitoring
    poolInstance.on('error', (err) => {
      logger.error('Database pool error (singleton)', { error: err.message })
    })

    poolInstance.on('connect', () => {
      logger.debug('Database connection established (singleton)')
    })

    dbInstance = drizzle(poolInstance, { schema, logger: process.env.NODE_ENV === 'development' })
  }
  return dbInstance
}

/**
 * @function closeDatabase
 * @description Cierra el pool de conexiones de PostgreSQL.
 * Se debe llamar durante el "graceful shutdown" del servidor.
 */
export const closeDatabase = async (): Promise<void> => {
  if (poolInstance !== null) {
    await poolInstance.end()
    poolInstance = null
    dbInstance = null
    console.log('✅ PostgreSQL pool closed successfully.')
  }
}
