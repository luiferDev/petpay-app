import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  pgEnum,
  serial,
  integer,
  doublePrecision,
  primaryKey,
  uniqueIndex,
  unique
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// --- CONEXIÓN (Mantenida de tu código) ---
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export const Db = drizzle({ client: pool })
// ----------------------------------------

// -------------------- ENUMS DE DOMINIO --------------------
export const accountTypeEnum = pgEnum('account_type', ['INDIVIDUAL', 'FAMILY', 'BUSINESS'])
export const roleEnum = pgEnum('role', ['CLIENT', 'SERVICE_PROVIDER', 'ADMIN'])
export const permissionLevelEnum = pgEnum('permission_level', ['READ', 'WRITE', 'ADMIN', 'OWNER'])

// -------------------- TABLAS --------------------

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex('email_idx').on(table.email)
])

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  type: accountTypeEnum('account_type').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  // Relación Uno-a-Muchos: Un usuario puede tener muchas direcciones
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  street: varchar('street', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const userRoles = pgTable('user_roles', {
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull()
}, (table) => [
  primaryKey({ columns: [table.userId, table.role] })
])

export const accountUsers = pgTable('account_users', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  permissionLevel: permissionLevelEnum('permission_level').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull()
}, (table) => [
  unique('account_user_unique').on(table.accountId, table.userId)
])

// -------------------- RELACIONES (Relations) --------------------
// Estas estructuras están correctas y no deben moverse.

export const userRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  userRoles: many(userRoles),
  accountUsers: many(accountUsers)
}))

export const accountRelations = relations(accounts, ({ many }) => ({
  accountUsers: many(accountUsers)
}))

export const addressRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id]
  })
}))

export const userRoleRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  })
}))

export const accountUserRelations = relations(accountUsers, ({ one }) => ({
  user: one(users, {
    fields: [accountUsers.userId],
    references: [users.id]
  }),
  account: one(accounts, {
    fields: [accountUsers.accountId],
    references: [accounts.id]
  })
}))
