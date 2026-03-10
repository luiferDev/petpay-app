import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { Config } from './src/infrastructure/config/env'

export default defineConfig({
  out: './drizzle',
  schema: './src/infrastructure/database/drizzle/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: Config.DATABASE_URL
  }
})
