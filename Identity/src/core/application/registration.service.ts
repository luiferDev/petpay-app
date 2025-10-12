import { IUserRepository } from '../domain/ports/user.repository'
import { FullRegistrationRequestInput } from '../../infrastructure/web/validations/register.validation'
import { z } from 'zod'
import { logger } from '../../core/infrastructure/shared/logger'

export class RegistrationService {
  // El constructor ahora recibe una implementación de la interfaz
  constructor (private readonly userRepository: IUserRepository) { }

  async register (requestBody: FullRegistrationRequestInput): Promise<{ status: number, message: string, data?: { userId: string, accountId: number }, errors?: z.ZodError }> {
    try {
      logger.info('🚀 Iniciando proceso de registro en RegistrationService')
      logger.debug('📋 Datos recibidos para registro:', { email: requestBody.email })

      const validatedData = requestBody

      // 2. Lógica de negocio (ej. verificar si el email ya existe)
      logger.debug('🔍 Verificando si el email ya existe:', { email: validatedData.email })
      const existingUser = await this.userRepository.findByEmail(validatedData.email)

      if (existingUser !== null) {
        logger.warn('⚠️ Email ya registrado:', { email: validatedData.email })
        return { status: 409, message: 'El correo electrónico ya está registrado.' }
      }

      logger.info('✅ Email disponible, procediendo con el registro')

      // 3. Llamar al Puerto (el Adaptador se encarga de la DB)
      logger.debug('💾 Creando usuario y cuenta en la base de datos')
      const { userId, accountId } = await this.userRepository.registerUserWithAccount(
        validatedData,
        validatedData.account
      )

      logger.info('✅ Usuario registrado exitosamente:', { userId, accountId })

      return {
        status: 201,
        message: 'Registro completado.',
        data: { userId, accountId }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('❌ Error de validación en RegistrationService:', { issues: error.issues })
        return { status: 400, message: 'Datos de entrada inválidos.', errors: error }
      }

      logger.error('❌ Error inesperado en RegistrationService:', error)
      return { status: 500, message: 'Error en la persistencia de datos.' }
    }
  }
}
