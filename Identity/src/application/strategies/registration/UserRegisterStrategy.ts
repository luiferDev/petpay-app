// src/application/strategies/registration/UserRegisterStrategy.ts

import { injectable, inject } from 'tsyringe'
import { User } from '../../../domain/entities/User'

import { AccountType } from '../../../domain/types/AccountType'
import { IAccountRepository } from '../../ports/IAccountRepository'
import { IRegistrationStrategy } from '../../ports/IRegistrationStrategy'
import { IEmailService } from '../../ports/IEmailService'
import { ITokenService } from '../../ports/ITokenService'
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto'
import { INJECTION_TOKENS } from '../../../infrastructure/DI/InjectionTokens'

/**
 * @interface IRegistrationStrategyWithAccount
 * @description Extension of IRegistrationStrategy that includes account creation logic
 */
export interface IRegistrationStrategyWithAccount extends IRegistrationStrategy {
  applySpecifics(user: User, request: RegisterUserRequest): Promise<User>
}

/**
 * @class ClientRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo CLIENT.
 */
@injectable()
export class ClientRegistrationStrategy implements IRegistrationStrategyWithAccount {
  constructor(
    @inject(INJECTION_TOKENS.ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @inject(INJECTION_TOKENS.EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenService: ITokenService
  ) { }

  public async applySpecifics(user: User, request: RegisterUserRequest): Promise<User> {
    console.log(`[STRATEGY] User ${user.email} registered as CLIENT.`)

    // Enviar correo de verificación
    await this.emailService.sendVerificationEmail(user.email, user.firstName, user.id!)
    console.log(`[STRATEGY] Verification email sent to ${user.email}`)

    return user
  }
}

/**
 * @class ServiceProviderRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo SERVICE_PROVIDER.
 */
@injectable()
export class ServiceProviderRegistrationStrategy implements IRegistrationStrategyWithAccount {
  constructor(
    @inject(INJECTION_TOKENS.ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @inject(INJECTION_TOKENS.EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @inject(INJECTION_TOKENS.TOKEN_PROVIDER)
    private readonly tokenService: ITokenService
  ) { }

  public async applySpecifics(user: User, request: RegisterUserRequest): Promise<User> {
    console.log(`[STRATEGY] User ${user.email} registered as SERVICE_PROVIDER.`)

    // Enviar correo de verificación
    await this.emailService.sendVerificationEmail(user.email, user.firstName, user.id!)
    console.log(`[STRATEGY] Verification email sent to ${user.email}`)

    return user
  }
}
