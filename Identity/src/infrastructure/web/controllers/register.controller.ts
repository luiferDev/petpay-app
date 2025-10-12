import { Request, Response, NextFunction } from 'express'
import { RegistrationService } from '../../../core/application/registration.service'
import { fullRegistrationRequestSchema } from '../validations/register.validation'
import { logger } from '../../shared/logger'
import { z } from 'zod'

// 💡 CORRECCIÓN CLAVE: El controlador recibe el servicio inyectado y devuelve un middleware.
export const registerController = (service: RegistrationService) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('📝 Iniciando registro de usuario...')
      logger.debug('📝 Datos recibidos:', { body: req.body })

      // 1. Validar la entrada (Función del Adaptador Web)
      logger.debug('⚙️ Validando datos...')
      const validatedData = fullRegistrationRequestSchema.parse(req.body)

      logger.info('✅ Datos validados exitosamente')

      // 2. Llamar al Caso de Uso (Núcleo)
      logger.debug('🛠️ Llamando al servicio de registro...')
      const result = await service.register(validatedData)
      logger.info('✅ Servicio ejecutado exitosamente', { result })

      // 3. Formatear y Enviar la Respuesta (Función del Adaptador Web)
      res.status(201).json({
        message: result.message,
        data: result.data // Asegúrate de que 'result' tenga un campo 'data' con userId/accountId
      })
    } catch (error) {
      logger.error('❌ Error en registerController:', error)

      // Manejar errores de Zod (Errores del Adaptador Web)
      if (error instanceof z.ZodError) {
        logger.warn('❌ Error de validación Zod:', { issues: error.issues })
        // Enviar respuesta de validación 400 Bad Request
        res.status(400).json({
          message: 'Error de validación de entrada.',
          errors: error.issues
        })
        return
      }

      // Manejar otros errores (ej. 409 Conflicto si el email ya existe, 500 interno)
      if (error instanceof Error) {
        logger.error('❌ Error del servidor:', { message: error.message, stack: error.stack })
        // Enviar respuesta de error 500 Internal Server Error
        res.status(500).json({
          message: 'Error interno del servidor.',
          error: error.message
        })
        return
      }

      logger.error('❌ Error desconocido:', error)
      // ⚠️ Si el servicio lanza un error, usamos el middleware de errores de Express/Bun
      next(error)
    }
  }
