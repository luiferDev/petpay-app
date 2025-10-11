import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

let db: ReturnType<typeof drizzle> | null = null
let pool: Pool | null = null

export const getDatabase = (): ReturnType<typeof drizzle> => {
  if (db == null) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres'
    })
    db = drizzle({ client: pool })
  }
  return db
}

export const closeDatabase = async (): Promise<void> => {
  if (pool != null) {
    await pool.end()
    pool = null
    db = null
  }
}
