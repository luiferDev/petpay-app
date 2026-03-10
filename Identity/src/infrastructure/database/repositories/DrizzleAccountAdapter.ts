import { inject, injectable, singleton } from 'tsyringe'
import { type DbClient } from '../drizzle/client'
import { accounts, accountUsers } from '../drizzle/schema'
import { IAccountRepository, Account } from '../../../domain/repositories/IAccountRepository'
import { INJECTION_TOKENS } from '../../DI/InjectionTokens'
import type { AccountType } from '../../../domain/types/AccountType'

@injectable()
@singleton()
export class DrizzleAccountAdapter implements IAccountRepository {
  constructor(@inject(INJECTION_TOKENS.DB_CLIENT) private readonly db: DbClient) {}

  async createAccountAndAssignOwner(
    accountName: string,
    type: AccountType,
    userId: string
  ): Promise<Account> {
    console.log('[DrizzleAccountAdapter] Creating account:', { accountName, type, userId })
    console.log('[DrizzleAccountAdapter] type value:', type, 'type enum:', AccountType.INDIVIDUAL)
    try {
      return await this.db.transaction(async (tx) => {
        console.log('[DrizzleAccountAdapter] Starting transaction...')
        const [newAccount] = await tx.insert(accounts)
          .values({ accountName, type })
          .returning()
        console.log('[DrizzleAccountAdapter] Account created:', newAccount)

        if (!newAccount) throw new Error('Failed to create account')

        await tx.insert(accountUsers).values({
          accountId: newAccount.id,
          userId,
          permissionLevel: 'OWNER'
        })

        return {
          id: newAccount.id.toString(),
          name: newAccount.accountName,
          type: newAccount.type,
          ownerId: userId,
          createdAt: newAccount.createdAt,
          updatedAt: newAccount.updatedAt
        }
      })
    } catch (error) {
      console.error('[DrizzleAccountAdapter] Error:', error)
      throw error
    }
  }
}
