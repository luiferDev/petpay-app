import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../lib/logger'
import { UserRole } from '../interfaces/IUserRepository'

// Extiende la interfaz Request de Express para incluir los datos del usuario
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: UserRole;
    };
  }
}

// Obtener la clave secreta de las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET_KEY ?? 'secret'

/**
 * Middleware para verificar la validez del token JWT y adjuntar los datos del usuario a la Request.
 * @param req Objeto de solicitud de Express
 * @param res Objeto de respuesta de Express
 * @param next Función para pasar al siguiente middleware/controlador
 */
export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Obtener el token de la cookie (asumimos que se usa cookie httponly)
    const token: string | undefined = req.cookies?.access_token

    if (!token) {
      logger.warn('Acceso denegado: No se encontró token en cookies.')
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
      role: decoded.role,
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
    if (!req.user) {
      return res.status(500).json({ message: 'Error de configuración: Middleware de protección faltante.' });
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
