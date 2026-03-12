import { NextFunction, Request, Response } from 'express'

import { UserRole } from '../../../domain/types/Role'
import * as jwt from 'jsonwebtoken'
import { logger } from '../../../shared/utils/logger'

// Obtener la clave secreta de las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET_KEY ?? 'secret'

/**
 * Extrae el token JWT de la cookie o del header Authorization.
 * @param req Objeto de solicitud de Express
 * @returns El token JWT o undefined si no se encuentra
 */
function extractToken(req: Request): string | undefined {
  // 1. Primero intentar obtener del header Authorization (Bearer token)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 2. Si no hay Bearer, intentar de la cookie
  return req.cookies?.access_token
}

/**
 * Middleware para verificar la validez del token JWT y adjuntar los datos del usuario a la Request.
 * Acepta tokens tanto de cookies como del header Authorization (Bearer token).
 * @param req Objeto de solicitud de Express
 * @param res Objeto de respuesta de Express
 * @param next Función para pasar al siguiente middleware/controlador
 */
export const protect = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. Extraer token de cookie o header Authorization
    const token = extractToken(req)

    if (token === null || token === undefined || token === '') {
      logger.warn('Acceso denegado: No se encontró token en cookies ni en Authorization header.')
      return res.status(401).json({ message: 'Acceso no autorizado. Token no proporcionado.' })
    }

    // 2. Verificar y decodificar el token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      role: UserRole
      iat: number
      exp: number
    }

    // 3. Adjuntar datos del usuario a la Request para su uso en los controladores
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    }

    logger.debug('Token validado exitosamente', { userId: req.user.id, role: req.user.role })

    // 4. Continuar con la siguiente función (controlador)
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Token inválido/expirado', { error: error.message })
      return res.status(401).json({ message: 'Token inválido o expirado.' })
    }

    logger.error('Error interno en el middleware de autenticación', { error })
    return res.status(500).json({ message: 'Error interno de autenticación.' })
  }
}

/**
 * Middleware para restringir el acceso solo a ciertos roles.
 * Debe usarse DESPUÉS del middleware 'protect'.
 * @param allowedRoles Array de roles permitidos (ej: [UserRole.ADMIN])
 */
export const restrictTo = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Si req.user no existe, el middleware 'protect' falló o no se usó primero.
    if (req.user == null) {
      return res.status(500).json({ message: 'Error de configuración: Middleware de protección faltante.' })
    }

    const userRole = req.user.role

    if (allowedRoles.includes(userRole)) {
      // El rol está permitido, continúa.
      next()
    } else {
      logger.warn('Acceso denegado por rol', { userId: req.user.id, userRole, requiredRoles: allowedRoles })
      return res.status(403).json({ message: 'Acceso prohibido. No tiene permisos para esta acción.' })
    }
  }
}
