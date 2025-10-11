import { FullRegistrationRequestInput, fullRegistrationRequestSchema } from '../schema/register-schema'
import { UserRepository } from '../model/user-repository'
import { z } from 'zod'

export class AuthService {
  private readonly authRepository: typeof UserRepository

  constructor ({ authRepository }: { authRepository: typeof UserRepository }) {
    this.authRepository = authRepository
  }

  async register (requestBody: unknown): Promise<{ status: number, message: string, data?: { userId: string, accountId: number }, errors?: z.ZodError }> {
    try {
      const validatedData: FullRegistrationRequestInput = fullRegistrationRequestSchema.parse(requestBody)
      const userData = validatedData
      const accountData = validatedData.account

      const { userId, accountId } = await this.authRepository.registerUser(
        userData,
        accountData
      )

      return {
        status: 201,
        message: 'Registro completado.',
        data: { userId, accountId }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { status: 400, message: 'Datos de entrada inválidos.', errors: error }
      }

      console.error('Error en el registro:', error)
      return { status: 500, message: 'Error en la persistencia de datos.' }
    }
  }
}
