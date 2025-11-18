// src/infrastructure/http/middlewares/validation.middleware.ts

import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

import { logger } from '../../../shared/utils/logger';

/**
 * @function validate
 * @description Middleware genérico para validar el req.body contra un esquema Zod.
 * Detiene la petición y responde con 400 Bad Request si la validación falla.
 * @param {ZodSchema<any>} schema - El esquema Zod a utilizar.
 * @returns {Function} Middleware de Express.
 */
export const validate = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Ejecutar la validación
      schema.parse(req.body);
      
      // 2. Si es exitoso, continuar
      next();
    } catch (error) {
      // 3. Manejar error de Zod
      if (error instanceof ZodError) {
        logger.warn('Validation failed on incoming request', { 
            path: req.path, 
            details: error.errors 
        });
        
        // Retornar un 400 con los detalles de la validación
        return res.status(400).json({
          status: 400,
          error: 'Validation Error',
          message: 'One or more fields are invalid.',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      
      // Si es otro tipo de error, pasarlo al handler global
      next(error);
    }
  };
};