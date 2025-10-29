import { userRoles } from "../../model/schema"
import { InsertUserRole, Role, TX, UserRegisterTemplate } from "../register.template"

// Implementación concreta para proveedores de servicio
export class ServiceProviderUserRegister extends UserRegisterTemplate {
  protected async assignGlobalRole(tx: TX, userId: string): Promise<Role> {
    const userRoleToInsert: InsertUserRole = {
      userId,
      role: Role.SERVICE_PROVIDER
    }
    await tx.insert(userRoles).values(userRoleToInsert)
    return Role.SERVICE_PROVIDER
  }
}