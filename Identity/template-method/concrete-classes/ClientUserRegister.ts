import { InsertUserRole, Role, TX, UserRegisterTemplate } from "../register.template"
import { userRoles } from "../../model/schema"


// Implementación concreta para clientes
export class ClientUserRegister extends UserRegisterTemplate {
  protected async assignGlobalRole(tx: TX, userId: string): Promise<Role> {
    const userRoleToInsert: InsertUserRole = {
      userId,
      role: Role.CLIENT
    }
    await tx.insert(userRoles).values(userRoleToInsert)
    return Role.CLIENT
  }
}