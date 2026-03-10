# Exploration: Identity Hexagonal Architecture

## Current State

The Identity service already implements a well-structured Clean Architecture with clear separation of layers:

### Architecture Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| **Domain** | `src/domain/` | Entities, errors, events, repository interfaces (ports) |
| **Application** | `src/application/` | Use cases, DTOs, strategies, port interfaces |
| **Infrastructure** | `src/infrastructure/` | Controllers, DB repositories, services, DI |
| **Shared** | `src/shared/` | Utilities |

### Current Structure

```
Identity/src/
├── application/
│   ├── dtos/                    # RegisterUser.dto.ts, LoginDTOs.ts, UserResponse.dto.ts
│   ├── ports/                   # IAccountRepository, IEmailService, IEventPublisher, ITokenService
│   ├── strategies/registration/  # AdminRegistration, ServiceProviderRegistration, UserRegisterStrategy
│   └── use-case/
│       ├── auth/                # RegisterUserUseCase, LoginUseCase
│       └── oauth/               # OAuthLoginUseCase, LinkOAuthProviderUseCase
├── domain/
│   ├── entities/                # User.ts (Aggregate Root)
│   ├── errors/                  # DomainError.ts, OAuthError.ts
│   ├── events/                  # UserCreatedEvent, ServiceProviderRegisteredEvent
│   ├── repositories/            # IUserRepository.ts (port definition)
│   └── types/                   # Role.ts, AccountType.ts
├── infrastructure/
│   ├── config/                  # env.ts
│   ├── database/
│   │   ├── drizzle/             # client.ts, schema.ts, migrations/
│   │   └── repositories/        # DrizzleUserRepository, OAuthUserRepository
│   ├── DI/                      # container.ts (tsyringe), InjectionTokens.ts
│   ├── http/
│   │   ├── controllers/         # AuthController, OAuthController
│   │   ├── middlewares/         # auth, cors, error handler, validation
│   │   ├── routes/              # auth.routes, oauth.routes
│   │   └── validation/zod-schemas/
│   ├── messaging/               # RabbitMQEventPublisher
│   └── services/                # JwtTokenProvider, NodemailerService, OAuth providers
└── shared/
    └── utils/                   # logger.ts, ulid.ts
```

### Dependency Flow

Current dependency organization follows Clean Architecture principles:
- **Domain** has no external dependencies (pure TypeScript)
- **Application** depends on Domain (ports, entities) - `IUserRepository` from domain/repositories
- **Infrastructure** implements Application ports and depends on external libraries (Drizzle, Express, RabbitMQ, etc.)

### Existing Ports/Interfaces

| Port Name | Location | Implements |
|-----------|----------|------------|
| `IUserRepository` | `domain/repositories/` | Infrastructure adapter |
| `IAccountRepository` | `application/ports/` | (In progress) |
| `ITokenService` | `application/ports/` | JwtTokenProvider |
| `IEmailService` | `application/ports/` | NodemailerService |
| `IEventPublisher` | `application/ports/` | RabbitMQEventPublisher |
| `IOAuthProvider` | `application/ports/` | GoogleOAuthProvider, GitHubOAuthProvider |
| `IRegistrationStrategy` | `application/ports/` | UserRegisterStrategy, etc. |

### Current Hexagonal Patterns

1. **Ports & Adapters**: Clear separation between interfaces (ports) in domain/application and implementations (adapters) in infrastructure
2. **Dependency Injection**: Uses tsyringe with constructor injection
3. **Aggregate Root**: User entity as the main aggregate
4. **Domain Events**: UserCreatedEvent, ServiceProviderRegisteredEvent published via RabbitMQ
5. **Strategy Pattern**: Registration strategies (User, Admin, ServiceProvider)
6. **Repository Pattern**: IUserRepository with DrizzleUserRepository implementation

## Affected Areas

- `Identity/src/domain/repositories/IUserRepository.ts` — Core port in domain layer
- `Identity/src/application/ports/` — Additional ports (ITokenService, IEmailService, etc.)
- `Identity/src/application/use-case/auth/` — Use cases depend on domain ports
- `Identity/src/infrastructure/database/repositories/` — Repository implementations
- `Identity/src/infrastructure/DI/container.ts` — DI configuration wiring ports to adapters

## Approaches

### 1. Full Hexagonal Architecture Migration
Complete migration to pure hexagonal (ports & adapters) with:
- All ports moved to `domain/ports/` 
- Domain owns all interfaces
- Application layer only contains use cases
- Infrastructure implements domain ports

**Pros**: Pure separation, domain-centric, testable
**Cons**: Large refactoring, breaking changes
**Effort**: High

### 2. Incremental Hexagonal Enhancement
Keep current structure but:
- Add missing domain ports (IAccountRepository already in progress)
- Ensure all external dependencies only in infrastructure
- Add explicit adapter interface markers

**Pros**: Lower risk, gradual improvement
**Cons**: Still some mixed responsibilities
**Effort**: Medium

### 3. Current Architecture Polish
Enhance existing Clean Architecture:
- Add missing tests
- Document ports better
- Add more domain events

**Pros**: Minimal disruption
**Cons**: Doesn't address hexagonal goals
**Effort**: Low

## Recommendation

**Approach #2 (Incremental Hexagonal Enhancement)** is recommended because:
1. The current architecture already follows Clean Architecture with clear separation
2. Moving all ports to domain may break existing patterns (e.g., `IAccountRepository` in application layer)
3. The service already has proper DI with tsyringe
4. Most "hexagonal" benefits can be achieved by ensuring consistent patterns

However, if the goal is pure hexagonal, the main changes needed are:
- Move remaining port interfaces from `application/ports/` to `domain/ports/`
- Ensure infrastructure adapters implement domain interfaces only
- Add explicit "Adapter" suffix to infrastructure implementations

## Risks

- Breaking existing dependency injection if ports are moved
- Test breakage if interfaces change signatures
- Need to update AGENTS.md documentation to reflect any changes
- OAuth features may have additional complexity due to external provider integration

## Ready for Proposal

**Yes** — The exploration shows Identity already has a solid Clean Architecture foundation that closely aligns with hexagonal principles. The change should focus on:
1. Consolidating ports in domain layer
2. Ensuring consistent naming (Adapter suffix for implementations)
3. Possibly adding more domain-driven design elements (value objects, domain services)
4. Documenting the hexagonal boundaries in AGENTS.md
