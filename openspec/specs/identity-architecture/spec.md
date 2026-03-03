# Delta for Identity Architecture

## Purpose

This specification defines the requirements for enhancing hexagonal architecture patterns in the Identity service. It establishes conventions for port interface placement, adapter naming, dependency injection consistency, and type-safe interfaces.

## ADDED Requirements

### Requirement: Port Interface Placement

Port interfaces that define persistence contracts for domain aggregates SHALL be defined in the `domain/repositories/` directory. Port interfaces that define external service contracts SHALL be defined in the `application/ports/` directory.

The system MUST maintain a clear separation between:
- **Domain Ports**: Interfaces that belong to the domain layer (repository contracts for aggregates)
- **Application Ports**: Interfaces for external services (email, events, tokens, OAuth)

#### Scenario: Creating a new repository port for a domain aggregate

- GIVEN a new domain aggregate called "Account" is defined in `domain/entities/Account.ts`
- WHEN the team needs to create a persistence contract for this aggregate
- THEN a new interface `IAccountRepository.ts` MUST be created in `domain/repositories/`
- AND the interface MUST use the prefix `I` followed by the aggregate name and suffix `Repository`
- AND the interface MUST be imported in the application layer via `domain/repositories/IAccountRepository`

#### Scenario: Creating a new service port in application layer

- GIVEN a new external service integration (e.g., SMS provider) is required
- WHEN the team needs to create a contract for this service
- THEN a new interface `ISmsService.ts` MUST be created in `application/ports/`
- AND the interface MUST use the prefix `I` followed by the service name

### Requirement: Adapter Naming Conventions

All repository and service implementations in the infrastructure layer MUST use the "Adapter" suffix. The naming pattern SHALL follow: `{Technology}{Entity}Adapter.ts` or `{Entity}Adapter.ts` when the technology is implicit.

#### Scenario: Renaming a Drizzle repository implementation

- GIVEN an existing file `drizzle.user.repository.ts` in `infrastructure/database/repositories/`
- WHEN the file is renamed to follow the new convention
- THEN it MUST be renamed to `DrizzleUserAdapter.ts`
- AND the class inside MUST be renamed to `DrizzleUserAdapter`
- AND a re-export MUST be maintained from the old filename for backward compatibility

#### Scenario: Renaming an OAuth repository implementation

- GIVEN an existing file `OAuthUserRepository.ts` in `infrastructure/database/repositories/`
- WHEN the file is renamed to follow the new convention
- THEN it MUST be renamed to `OAuthUserAdapter.ts`
- AND the class inside MUST be renamed to `OAuthUserAdapter`

### Requirement: Dependency Injection Consistency

All dependency injection registrations in the DI container MUST follow a consistent pattern. The container MUST register interfaces to implementations using constructor injection with explicit type annotations.

#### Scenario: Registering a new adapter in the DI container

- GIVEN a new adapter `DrizzleUserAdapter` that implements `IUserRepository`
- WHEN registering the adapter in `infrastructure/DI/container.ts`
- THEN the registration MUST use explicit generic type: `container.register<IUserRepository>(INJECTION_TOKENS.USER_REPOSITORY, { useClass: DrizzleUserAdapter })`
- AND MUST use an injection token from `InjectionTokens.ts`

#### Scenario: Injecting a repository into a use case

- GIVEN a use case class `RegisterUserUseCase` that depends on `IUserRepository`
- WHEN the use case is instantiated
- THEN the constructor MUST declare the dependency with `private readonly` modifier: `constructor(private readonly userRepository: IUserRepository)`
- AND the type MUST be the interface, not the implementation

### Requirement: Type-Safe Port Interfaces

All port interfaces MUST use TypeScript's explicit type annotations. Generic type parameters MUST be defined when the interface operates on multiple entity types. Return types MUST be explicit and not use `any`.

#### Scenario: Defining a type-safe repository interface

- GIVEN a new repository interface for an aggregate
- WHEN defining the interface methods
- THEN method parameters MUST have explicit type annotations
- THEN return types MUST use specific types, not `any` or `unknown`
- THEN generic types MUST be used when the repository operates on multiple types: `interface IRepository<T extends BaseEntity>`

#### Scenario: Using a type-safe repository in a use case

- GIVEN a use case that calls `userRepository.findById(id)`
- WHEN the id parameter is passed
- THEN the id parameter MUST be typed as `string | number` (depending on the ID type)
- AND the return value MUST be properly typed in the use case

### Requirement: Backward Compatibility Through Re-exports

When port interfaces or adapters are moved or renamed, re-export files MUST be maintained at the old locations to prevent breaking changes in consuming code.

#### Scenario: Moving a port interface to a new location

- GIVEN `IUserRepository.ts` is moved from `application/ports/` to `domain/repositories/`
- WHEN other files import from the old path
- THEN a re-export file MUST be created at the old location: `application/ports/IUserRepository.ts` MUST re-export from `domain/repositories/IUserRepository.ts`
- AND existing imports MUST continue to work without modification

### Requirement: Documentation of Hexagonal Architecture Patterns

The Identity service AGENTS.md file MUST include a section documenting the hexagonal architecture patterns used, including port/interface locations, adapter naming conventions, and DI patterns.

#### Scenario: Adding architecture documentation

- GIVEN the Identity service hexagonal architecture is enhanced
- WHEN updating the AGENTS.md file
- THEN a new section "Hexagonal Architecture" MUST be added
- AND it MUST document:
  - Where port interfaces are defined (domain/repositories vs application/ports)
  - Naming convention for adapters (Adapter suffix)
  - DI registration patterns
  - Examples of each pattern

## MODIFIED Requirements

### Requirement: Existing Port Interface Locations

(Previously: Port interfaces were scattered across `application/ports/` and `domain/repositories/` without clear guidelines)

Port interfaces for domain aggregates (like `IUserRepository`) MUST be in `domain/repositories/`. Port interfaces for application services (like `IEmailService`, `ITokenProvider`) SHOULD remain in `application/ports/`.

#### Scenario: Consolidating existing port interfaces

- GIVEN existing port interfaces in `application/ports/` including `IUserRepository.ts`
- WHEN the consolidation is performed
- THEN `IUserRepository.ts` MUST be moved to `domain/repositories/IUserRepository.ts`
- AND a re-export MUST be maintained at `application/ports/IUserRepository.ts`

### Requirement: Adapter File Naming

(Previously: Repository implementations used `.repository.ts` suffix)

Repository and service implementations in the infrastructure layer MUST use the `Adapter` suffix. Existing implementations with `.repository.ts` suffix SHOULD be renamed following the pattern `{Technology}{Entity}Adapter`.

#### Scenario: Renaming existing adapter files

- GIVEN `DrizzleUserRepository` class in `drizzle.user.repository.ts`
- WHEN renamed following the new convention
- THEN the file becomes `DrizzleUserAdapter.ts`
- AND the class becomes `DrizzleUserAdapter`

## REMOVED Requirements

### Requirement: Repository Implementation Files with `.repository.ts` Suffix

(Reason: This naming convention is replaced by the Adapter suffix to clearly distinguish between the port interface (the contract) and the implementation (the adapter))

Repository implementation files MUST NOT use the `.repository.ts` suffix. Existing files with this suffix MUST be renamed to use the `Adapter` suffix.

---

## Summary

| Category | Count |
|----------|-------|
| Added Requirements | 6 |
| Modified Requirements | 2 |
| Removed Requirements | 1 |

---

## Related Artifacts

- `Identity/src/domain/repositories/` - Domain port interfaces
- `Identity/src/application/ports/` - Application port interfaces  
- `Identity/src/infrastructure/database/repositories/` - Adapter implementations
- `Identity/src/infrastructure/DI/container.ts` - DI container configuration
- `Identity/AGENTS.md` - Architecture documentation
