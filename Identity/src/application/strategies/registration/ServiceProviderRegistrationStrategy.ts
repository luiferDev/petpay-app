// src/application/strategies/registration/ServiceProviderRegistrationStrategy.ts

import { BaseRegistrationStrategy } from './UserRegisterStrategy'; // Importa la clase base abstracta
import { DomainError } from '../../../domain/errors/DomainError';
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto';
import { User } from '../../../domain/entities/User';

/**
 * @class ServiceProviderRegistrationStrategy
 * @description Estrategia específica para registrar un usuario de tipo SERVICE_PROVIDER.
 * ⚠️ Un proveedor debe ser verificado antes de operar. Esta estrategia implementa
 * la lógica de negocio para forzar este estado inicial.
 * * @augments BaseRegistrationStrategy
 * @author Petpay Architecture Team
 * @version 1.0
 * @since 2025-01-01
 */
export class ServiceProviderRegistrationStrategy extends BaseRegistrationStrategy {
    
    /**
     * @inheritdoc
     * @description Aplica la lógica de negocio específica para un proveedor de servicios.
     * * @param {User} user - El Aggregate Root User recién creado (con Account asociada).
     * @param {RegisterUserRequest} request - El request original.
     * @returns {Promise<User>} La entidad User modificada.
     */
    protected async assignSpecifics(user: User, request: RegisterUserRequest): Promise<User> {
        
        // Lógica de Negocio Crítica de Proveedor:
        
        // 1. Asignar estado inicial: El Proveedor NO está verificado al inicio.
        //    (El flag 'isVerified' debe ser false por defecto en la entidad User).
        user.markAsUnverified(); 
        
        // 2. Publicar evento para la creación del perfil en Providers Service
        //    (Esto se realiza después de la persistencia en RegisterUserUseCase).
        
        // 3. (Opcional) Validación de datos de proveedor (ej. número de licencia).
        // if (!request.licenseNumber) {
        //     throw new DomainError('Service Providers must provide a license number.');
        // }

        console.log(`[STRATEGY] User ${user.email} registered as SERVICE_PROVIDER. Marked as 'Unverified' for onboarding.`);
        
        return user;
    }
}