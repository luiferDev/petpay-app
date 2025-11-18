/**
 * @enum {string} Role
 * @description Representa los roles de alto nivel que un usuario puede tener en la plataforma Petpay.
 * Este es un Value Object inmutable que define las capacidades esenciales del usuario.
 * * Basado en: Diagframa UML new Entity Petcat.docx
 */
export type Role = 'CLIENT' | 'SERVICE_PROVIDER' | 'ADMIN';

/**
 * Nivel de permiso, aunque la lógica principal de roles es en User,
 * esta enum puede ser usada para AccountUser (entidad relacionada).
 */
export type PermissionLevel = 'READ' | 'WRITE' | 'ADMIN' | 'OWNER';