import { userRoles } from "../../model/schema"
import { InsertUserRole, Role, TX, UserRegisterTemplate } from "../register.template"

// Implementación concreta para administradores
export class AdminUserRegister extends UserRegisterTemplate {
  protected async assignGlobalRole(tx: TX, userId: string): Promise<Role> {
    const userRoleToInsert: InsertUserRole = {
      userId,
      role: Role.ADMIN
    }
    await tx.insert(userRoles).values(userRoleToInsert)
    return Role.ADMIN
  }
}
