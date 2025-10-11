import { z } from 'zod'

// --- ENUMS DE DOMINIO ---
// Zod necesita sus propias enumeraciones para validación
const roleEnumZod = z.enum(['CLIENT', 'SERVICE_PROVIDER', 'ADMIN'])
const accountTypeEnumZod = z.enum(['INDIVIDUAL', 'FAMILY', 'BUSINESS'])

// -------------------- 1. Esquema de Registro de Usuarios --------------------

// Define el patrón de contraseña (mínimo 8 caracteres, al menos una mayúscula, un número y un símbolo)
const passwordRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')

export const userRegisterSchema = z.object({
  // Email: Requerido, formato email, máx 255
  email: z.email('Formato de correo electrónico inválido.')
    .max(255, 'El correo no puede exceder los 255 caracteres.'),

  // Contraseña: Requerida y debe coincidir con el regex de seguridad
  passwordHash: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(passwordRegex, 'La contraseña debe incluir mayúsculas, minúsculas, números y símbolos.'),

  // Nombres y Apellidos: Requeridos, máx 100 caracteres, y saneamiento
  firstName: z.string()
    .min(2, 'El nombre es requerido.')
    .max(60, 'El nombre no puede exceder los 100 caracteres.')
    .trim(), // Elimina espacios en blanco innecesarios

  lastName: z.string()
    .min(2, 'El apellido es requerido.')
    .max(60, 'El apellido no puede exceder los 100 caracteres.')
    .trim(),

  // Teléfono: Opcional, máx 20 caracteres, se podría añadir un regex de formato si es necesario
  phone: z.string()
    .max(20, 'El teléfono no puede exceder los 20 caracteres.')
    .optional()
    .nullable()
})

// -------------------- 2. Esquema para la Creación de la Cuenta --------------------

// Este esquema valida el nombre y el tipo de la cuenta que se crea junto al usuario principal.
export const accountCreateSchema = z.object({
  accountName: z.string()
    .min(3, 'El nombre de la cuenta debe tener al menos 3 caracteres.')
    .max(255, 'El nombre de la cuenta no puede exceder los 255 caracteres.')
    .trim(),

  // El tipo de cuenta debe ser uno de los valores definidos en el enum de Zod
  type: accountTypeEnumZod,

  // Opcionalmente, se puede incluir el rol que el usuario principal tendrá en esta cuenta.
  // Usamos el enum de Drizzle, pero en Zod. Para el registro inicial, suele ser 'OWNER'.
  initialRole: z.literal('OWNER').default('OWNER')
})

// -------------------- 3. Tipos de TypeScript Inferred --------------------

/**
 * Tipo de datos para el objeto de entrada del usuario en el registro.
 */
export type UserRegisterInput = z.infer<typeof userRegisterSchema>

/**
 * Tipo de datos para la creación de una cuenta (usualmente en el registro inicial).
 */
export type AccountCreateInput = z.infer<typeof accountCreateSchema>

// -------------------- 4. Esquema Final del Request --------------------

// Combina ambos esquemas para validar el cuerpo completo de un request de registro
export const fullRegistrationRequestSchema = userRegisterSchema.extend({
  account: accountCreateSchema
})

/**
 * Tipo de datos para el cuerpo completo del request de registro.
 */
export type FullRegistrationRequestInput = z.infer<typeof fullRegistrationRequestSchema>
