import { z } from 'zod'

// --- ENUMS DE DOMINIO ---
const accountTypeEnumZod = z.enum(['INDIVIDUAL', 'FAMILY', 'BUSINESS'])

// Define el patrón de contraseña
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/

// -------------------- ESQUEMA DE REGISTRO --------------------

export const userRegisterSchema = z.object({
  email: z.email('Formato de correo electrónico inválido.')
    .max(255, 'El correo no puede exceder los 255 caracteres.'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(passwordRegex, 'La contraseña debe incluir mayúsculas, minúsculas, números y símbolos.'),
  fullName: z.string()
    .min(3, 'El nombre completo es requerido.')
    .max(120, 'El nombre completo no puede exceder los 120 caracteres.')
    .trim(),
  phone: z.string()
    .max(20, 'El teléfono no puede exceder los 20 caracteres.')
    .optional()
    .nullable()
}).transform((data) => {
  const nameParts = data.fullName.trim().split(/\s+/)
  const firstName = nameParts[0]
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]

  return {
    email: data.email,
    password: data.password,
    passwordHash: data.password,
    firstName,
    lastName,
    phone: data.phone ?? undefined
  }
})

// -------------------- ESQUEMA PARA CREACIÓN DE CUENTA --------------------

export const accountCreateSchema = z.object({
  accountName: z.string()
    .min(3, 'El nombre de la cuenta debe tener al menos 3 caracteres.')
    .max(255, 'El nombre de la cuenta no puede exceder los 255 caracteres.')
    .trim(),
  type: accountTypeEnumZod,
  initialRole: z.literal('OWNER').default('OWNER')
})

// -------------------- TIPOS INFERIDOS --------------------

export type UserRegisterInput = z.infer<typeof userRegisterSchema>
export type AccountCreateInput = z.infer<typeof accountCreateSchema>

// -------------------- LOGIN SCHEMA --------------------

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
})

export type LoginInput = z.infer<typeof loginSchema>
