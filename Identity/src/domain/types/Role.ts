/**
 * @enum {string} Role
 * @description Representa los roles de alto nivel que un usuario puede tener en la plataforma Petpay.
 * Este es un Value Object inmutable que define las capacidades esenciales del usuario.
 * * Basado en: Diagframa UML new Entity Petcat.docx
 */

export const Role = {
  CLIENT: 'CLIENT',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  ADMIN: 'ADMIN'
} as const

export type RoleType = typeof Role[keyof typeof Role]

// Alias for backward compatibility
export const UserRole = Role
export type UserRoleType = Role

export const PermissionLevel = {
  READ: 'READ',
  WRITE: 'WRITE',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER'
} as const

export type PermissionLevelType = typeof PermissionLevel[keyof typeof PermissionLevel]
