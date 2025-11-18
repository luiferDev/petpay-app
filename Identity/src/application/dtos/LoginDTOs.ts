import { UserResponse } from './UserResponse.dto';

/**
 * @interface LoginRequest
 * @description DTO de entrada para el caso de uso de inicio de sesión.
 * Contiene solo los campos necesarios para la autenticación, validados previamente por Zod.
 */
export interface LoginRequest {
  /**
   * Correo electrónico del usuario (clave para la búsqueda).
   */
  email: string;
  
  /**
   * Contraseña en texto plano (para ser comparada con el hash).
   */
  password: string;
}

/**
 * @interface LoginResponse
 * @description DTO de salida que contiene los datos de sesión generados por el Use Case.
 */
export interface LoginResponse {
  /**
   * DTO con la información pública del usuario autenticado.
   */
  user: UserResponse;
  
  /**
   * Token JWT de corta duración para autorizar peticiones a la API.
   */
  accessToken: string;
  
  /**
   * Token de larga duración para obtener un nuevo accessToken.
   */
  refreshToken: string;
}