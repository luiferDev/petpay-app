// src/domain/repositories/IAccountRepository.ts

import { PermissionLevel } from '../types/Role'
import { User } from '../entities/User'
import type { AccountType } from '../types/AccountType'

/**
 * @class Account
 * @description Convertido a clase para que Bun lo reconozca como un export válido en runtime.
 */
export class Account {
  id!: string
  name!: string
  type!: AccountType
  ownerId!: string
  createdAt!: Date
  updatedAt!: Date
}

/**
 * @class IAccountRepository
 * @description Port (Clase Abstracta) para operaciones de persistencia de Account.
 */
export abstract class IAccountRepository {
  /**
   * Crea una nueva cuenta y la asocia al usuario como OWNER.
   */
  abstract createAccountAndAssignOwner(
    accountName: string,
    type: AccountType,
    userId: string,
  ): Promise<Account>;
}