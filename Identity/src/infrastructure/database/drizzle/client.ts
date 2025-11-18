// src/infrastructure/database/drizzle/client.ts

import 'dotenv/config'

import * as schema from './schema' // Importamos el esquema de la misma carpeta

import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

/**
 * @typedef {ReturnType<typeof makeDatabaseClient>} DbClient
 * @description Alias de tipo para el cliente Drizzle con el esquema inyectado.
 */
export type DbClient = ReturnType<typeof makeDatabaseClient>;

/**
 * @function makeDatabaseClient
 * @description Inicializa y retorna el cliente Drizzle ORM conectado a PostgreSQL.
 * Utiliza un Pool de conexiones (pg) para manejo eficiente de recursos.
 * @returns Cliente Drizzle ORM.
 */
export function makeDatabaseClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // ⚠️ CONSIDERACIÓN DE SEGURIDAD: Nunca exponer la cadena de conexión real.
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const pool = new Pool({
    connectionString: connectionString,
    max: 20, // Pool size definido en consideraciones de performance
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  // Retorna el cliente Drizzle con el esquema cargado
  return drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' })
}

let dbInstance: DbClient | null = null;
let poolInstance: Pool | null = null;

/**
 * @function getDb
 * @description Singleton para obtener la única instancia del cliente Drizzle.
 * @returns {DbClient} Instancia del cliente Drizzle.
 */
export const getDb = (): DbClient => {
  if (dbInstance === null) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set in getDb")
    }

    poolInstance = new Pool({ connectionString })
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