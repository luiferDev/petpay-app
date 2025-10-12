import { AccountCreateInput, UserRegisterInput } from '../../../infrastructure/web/validations/register.validation'

export interface IUserRepository {
  /**
     * Guarda un nuevo usuario y su cuenta en la persistencia.
     */
  registerUserWithAccount: (
    userData: UserRegisterInput,
    accountData: AccountCreateInput
  ) => Promise<{ userId: string, accountId: number }>

  // Otros métodos de acceso a datos (ej. findByEmail, findById)
  findByEmail: (email: string) => Promise<any | null>
}
