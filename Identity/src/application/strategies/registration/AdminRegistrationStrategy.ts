// src/application/strategies/registration/AdminRegistrationStrategy.ts

import { injectable, inject } from 'tsyringe'
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto'
import { User } from '../../../domain/entities/User'
import { IRegistrationStrategy } from '../../ports/IRegistrationStrategy'
import { IEmailService } from '../../ports/IEmailService'
import { ITokenService } from '../../ports/ITokenService'
import { IAccountRepository } from '../../ports/IAccountRepository'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'

/**
 * @class AdminRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo ADMIN.
 */
@injectable()
export class AdminRegistrationStrategy implements IRegistrationStrategy {
  constructor (
    @inject(INJECTION_TOKENS.ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @inject(INJECTION_TOKENS.EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenService: ITokenService
  ) { }

  public async applySpecifics (user: User, request: RegisterUserRequest): Promise<User> {
    console.log(`[STRATEGY] User ${user.email} registered as ADMIN.`)

    // Enviar correo de verificación
    await this.emailService.sendVerificationEmail(user.email, user.firstName, user?.id ?? '')
    console.log(`[STRATEGY] Verification email sent to ${user.email}`)

    return user
  }
}
