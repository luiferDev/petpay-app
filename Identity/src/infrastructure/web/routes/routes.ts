// src/infrastructure/web/routes.ts

import { Router } from 'express'
import { RegistrationService } from '../../../core/application/registration.service'
import { registerController } from '../controllers/register.controller'

// La función router ahora acepta el servicio y lo usa para construir las rutas
export default (registrationService: RegistrationService): Router => {
  const router = Router()

  // El controlador ahora tiene acceso al servicio inyectado
  router.post('/register', registerController(registrationService))

  return router
}
