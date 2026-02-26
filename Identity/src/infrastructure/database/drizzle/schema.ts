// src/infrastructure/database/drizzle/schema.ts

import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  unique,
  varchar,
  text
} from 'drizzle-orm/pg-core'

import { relations } from 'drizzle-orm'

// -------------------- ENUMS DE DOMINIO --------------------
// Estas estructuras reflejan las ENUMs de tu metadata (0001_snapshot.json) y UML.
export const accountTypeEnum = pgEnum('account_type', ['INDIVIDUAL', 'FAMILY', 'BUSINESS'])
export const roleEnum = pgEnum('role', ['CLIENT', 'SERVICE_PROVIDER', 'ADMIN'])
export const permissionLevelEnum = pgEnum('permission_level', ['READ', 'WRITE', 'ADMIN', 'OWNER'])
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'github'])

// -------------------- TABLAS --------------------

/**
 * @description Tabla central de usuarios.
 * Usa varchar(36) para compatibilidad con UUIDs o IDs tipo ULID más largos.
 */
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
}, (table) => ({
  emailIndex: unique('users_email_unique').on(table.email) // Índice único para el email
}))

/**
 * @description Tabla para manejar la multi-tenancy y agrupación de usuarios (ej. familia).
 */
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  type: accountTypeEnum('account_type').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

/**
 * @description Tabla de relación M:N para asignar roles a un usuario (Cliente, Proveedor, Admin).
 */
export const userRoles = pgTable('user_roles', {
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.role] })
}))

/**
 * @description Tabla intermedia que vincula usuarios a cuentas (multi-tenancy).
 * Contiene el nivel de permiso dentro de esa cuenta.
 */
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
}, (table) => ({
  uniqueConstraint: unique('account_user_unique').on(table.accountId, table.userId)
}))

/**
 * @description Tabla para almacenar proveedores OAuth asociados a usuarios.
 * Permite que un usuario tenga múltiples proveedores (Google, GitHub).
 */
export const userOAuthProviders = pgTable('user_oauth_providers', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userProviderUnique: unique('user_provider_unique').on(table.userId, table.provider),
  providerUserUnique: unique('oauth_provider_user_unique').on(table.provider, table.providerUserId)
}))

// -------------------- RELACIONES (Relations) --------------------
// Drizzle Relations para facilitar consultas con joins
export const userRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  accountUsers: many(accountUsers),
  oauthProviders: many(userOAuthProviders)
  // Las direcciones (addresses) se han omitido temporalmente para reducir la complejidad del Aggregate
  // Pero deberían ser añadidas si se consideran parte del Aggregate Root de User.
}))

export const accountRelations = relations(accounts, ({ many }) => ({
  accountUsers: many(accountUsers)
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

export const userOAuthProviderRelations = relations(userOAuthProviders, ({ one }) => ({
  user: one(users, {
    fields: [userOAuthProviders.userId],
    references: [users.id]
  })
}))
