export class DIContainer {
  private static instance: DIContainer
  private services: Map<string, any> = new Map()

  private constructor() { }

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer()
    }
    return DIContainer.instance
  }

  /**
   * Register an instance or factory under a service name.
   * Use factories when you want lazy resolution (pass a function)
   */
  public register<T>(serviceName: string, provider: T | (() => T)): void {
    this.services.set(serviceName, provider)
  }

  /**
   * Initialize container with a set of bindings. Useful for bootstrapping
   * from an external module so the container itself remains agnostic of concrete implementations.
   */
  public initialize(bindings: Record<string, any>): void {
    Object.entries(bindings).forEach(([key, provider]) => this.register(key, provider))
  }

  /**
   * Resolve a service by name. If the registered provider is a factory function,
   * it will be invoked once and the resulting instance will be cached.
   */
  public get<T>(serviceName: string): T {
    if (!this.services.has(serviceName)) {
      throw new Error(`Service ${serviceName} not found`)
    }

    const provider = this.services.get(serviceName)

    // If it's a factory, call it the first time and replace with the instance
    if (typeof provider === 'function') {
      const instance = provider()
      this.services.set(serviceName, instance)
      return instance
    }

    return provider
  }
}