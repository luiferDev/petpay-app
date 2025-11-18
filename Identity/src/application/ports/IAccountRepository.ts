// src/application/ports/IAccountRepository.ts (NEW PORT)

import { Account, AccountType } from '../../domain/entities/Account';

import { PermissionLevel } from '../../domain/types/PermissionLevel';
import { User } from '../../domain/entities/User';

/**
 * @interface IAccountRepository
 * @description Port para la persistencia de cuentas y su relación con usuarios.
 */
export interface IAccountRepository {
    /**
     * Crea una nueva cuenta y la asocia al usuario como OWNER.
     * @param {string} accountName - Nombre de la nueva cuenta.
     * @param {AccountType} type - Tipo de cuenta (INDIVIDUAL, BUSINESS).
     * @param {string} userId - ID del usuario que será el dueño.
     * @returns {Promise<Account>} La cuenta creada.
     */
    createAccountAndAssignOwner(
        accountName: string,
        type: AccountType,
        userId: string,
    ): Promise<Account>;
    
    // ... otros métodos
}