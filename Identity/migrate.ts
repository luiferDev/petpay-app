// migrate.ts

import 'dotenv/config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

// 1. Configura la conexión de la DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Puedes añadir ssl: true para producción
  ssl: false
})
const db = drizzle(pool)

async function runMigrations (): Promise<void> {
  console.log('🚀 Iniciando migraciones...')
  try {
    // La función migrate toma la instancia de DB y la ruta a tu carpeta de migraciones
    await migrate(db, { migrationsFolder: './drizzle' })

    console.log('✅ Migraciones completadas exitosamente!')
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  } finally {
    // Cierra la conexión de la pool al terminar
    await pool.end()
  }
}

void runMigrations()
