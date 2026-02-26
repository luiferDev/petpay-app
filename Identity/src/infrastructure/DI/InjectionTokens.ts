// Usamos Symbol para asegurar unicidad y tipado fuerte en Tsyringe
export const INJECTION_TOKENS = {
  // Infraestructura (Componentes base)
  DB_CLIENT: Symbol.for('DbClient'),

  // Puertos de Aplicación (Interfaces)
  USER_REPOSITORY: Symbol.for('IUserRepository'),
  TOKEN_PROVIDER: Symbol.for('ITokenProvider'),
  EVENT_PUBLISHER: Symbol.for('IEventPublisher'),
  EMAIL_SERVICE: Symbol.for('IEmailService'),
  OAUTH_USER_REPOSITORY: Symbol.for('IOAuthUserRepository'),

  // Casos de Uso (para inyección en Controllers)
  REGISTER_USE_CASE: Symbol.for('RegisterUserUseCase'),
  LOGIN_USE_CASE: Symbol.for('LoginUseCase'),
  VERIFY_EMAIL_USE_CASE: Symbol.for('VerifyEmailUseCase'),
  OAUTH_LOGIN_USE_CASE: Symbol.for('OAuthLoginUseCase'),
  OAUTH_LINK_USE_CASE: Symbol.for('LinkOAuthProviderUseCase'),

  // Estrategias (Implementaciones del Template Method)
  REGISTRATION_STRATEGIES: Symbol.for('RegistrationStrategiesMap'),

  // Servicios de Infraestructura
  OAUTH_STATE_MANAGER: Symbol.for('OAuthStateManager')

} as const
