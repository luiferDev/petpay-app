# Identity Service - Agent Guidelines

TypeScript / Bun / Express / Drizzle ORM / PostgreSQL

---

## Commands

```bash
# Install dependencies
bun install

# Run development server (watch mode)
bun run dev

# Start production server
bun run start

# Lint code (ts-standard)
bun run lint

# Lint and auto-fix issues
bun run lint:fix

# Database migrations (Drizzle Kit)
bunx drizzle-kit push
bunx drizzle-kit generate
```

---

## Project Structure (Clean Architecture)

```
src/
├── application/                    # Casos de uso, DTOs, estrategias, puertos
│   ├── dtos/                      # Data Transfer Objects
│   │   ├── LoginDTOs.ts
│   │   ├── RegisterUser.dto.ts
│   │   └── UserResponse.dto.ts
│   ├── ports/                     # Interfaces (contratos) - re-exports from domain
│   │   ├── IAccountRepository.ts  # re-export from domain/repositories
│   │   ├── IEmailService.ts
│   │   ├── IEventPublisher.ts
│   │   ├── IRegistrationStrategy.ts
│   │   ├── ITokenService.ts
│   │   └── IUserRepository.ts     # re-export from domain/repositories
│   ├── strategies/                # Strategy Pattern para registro
│   │   └── registration/
│   │       ├── register.template.ts
│   │       ├── UserRegisterStrategy.ts
│   │       ├── ServiceProviderRegistrationStrategy.ts
│   │       └── AdminRegistrationStrategy.ts
│   └── use-case/                  # Casos de uso
│       └── auth/
│           ├── RegisterUserUseCase.ts
│           └── LoginUseCase.ts
│
├── domain/                        # Entidades, errores, eventos, interfaces de repos
│   ├── entities/
│   │   └── User.ts               # Aggregate Root
│   ├── errors/
│   │   └── DomainError.ts        # Errores base y personalizados
│   ├── events/                    # Domain Events
│   │   ├── UserCreatedEvent.ts
│   │   └── ServiceProviderRegisteredEvent.ts
│   ├── repositories/              # Interfaces de repositorio (Ports)
│   │   ├── IUserRepository.ts
│   │   ├── IAccountRepository.ts
│   │   └── IOAuthUserRepository.ts
│   └── types/
│       └── Role.ts
│
├── infrastructure/                # Implementaciones concretas
│   ├── config/
│   │   └── env.ts
│   ├── database/
│   │   ├── drizzle/
│   │   │   ├── client.ts         # Conexión a BD
│   │   │   └── schema.ts         # Esquema de BD
│   ├── repositories/              # Implementaciones (Adapters)
│   │       ├── DrizzleUserAdapter.ts
│   │       └── OAuthUserAdapter.ts
│   ├── DI/                        # Inyección de dependencias
│   │   ├── container.ts
│   │   └── InjectionTokens.ts
│   ├── http/
│   │   ├── controllers/
│   │   │   └── auth-controller.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── cors.ts
│   │   │   ├── error.handler.ts
│   │   │   └── validation.middleware.ts
│   │   ├── routes/
│   │   │   └── auth.routes.ts
│   │   ├── server.ts
│   │   └── validation/
│   │       └── zod-schemas/
│   │           ├── login-schema.ts
│   │           └── register-schema.ts
│   ├── messaging/
│   │   └── RabbitMQEventPublisher.ts
│   └── services/
│       ├── JwtTokenProvider.ts
│       └── NodemailerService.ts
│
└── shared/
    └── utils/
        ├── logger.ts
        └── ulid.ts
```

---

## Code Style Guidelines

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes/Interfaces/Types | PascalCase | `User`, `UserService`, `UserProps` |
| Functions/Variables | camelCase | `getUserById`, `userRepository` |
| Constants | camelCase | `SALT_ROUNDS`, `DEFAULT_PAGE_SIZE` |
| Files | kebab-case | `auth-controller.ts`, `user-repository.ts` |
| Database columns | snake_case | `created_at`, `user_id` |

### TypeScript Specific

#### Always Use Explicit Types
```typescript
// ✅ Good
public async execute(request: RegisterUserRequest): Promise<UserResponse> {
  const user: User = await this.userRepository.findById(id);
  return user;
}

// ❌ Bad
public async execute(request) {
  const user = await this.userRepository.findById(id);
  return user;
}
```

#### Prefer Interfaces for Objects, Types for Unions
```typescript
// ✅ Good - interface for object shape
interface UserProps {
  id?: number;
  email: string;
  passwordHash: string;
  firstName: string;
  roles: Role[];
}

// ✅ Good - type for union
type Role = 'USER' | 'ADMIN' | 'SERVICE_PROVIDER';
```

#### Use readonly for Immutable Data
```typescript
export class User {
  public readonly id: number | undefined;
  public readonly createdAt: Date | undefined;
}
```

---

### Const Types Pattern (REQUIRED)

** ALWAYS: Create const object first, then extract type**
```typescript
// ✅ Good - Single source of truth
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

// ❌ NEVER: Direct union types
type Status = "active" | "inactive" | "pending";
```

**Why?** Single source of truth, runtime values, autocomplete, easier refactoring.

### Flat Interfaces (REQUIRED)

```typescript
// ✅ ALWAYS: One level depth, nested objects → dedicated interface
interface UserAddress {
  street: string;
  city: string;
}

interface User {
  id: string;
  name: string;
  address: UserAddress;  // Reference, not inline
}

interface Admin extends User {
  permissions: string[];
}

// ❌ NEVER: Inline nested objects
interface UserBad {
  address: { street: string; city: string };  // NO!
}
```

### Never Use `any`

```typescript
// ✅ Use unknown for truly unknown types
function parse(input: unknown): User {
  if (isUser(input)) return input;
  throw new Error("Invalid input");
}

// ✅ Use generics for flexible types
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// ❌ NEVER use any
function parseBad(input: any): any { }
```

### Utility Types

```typescript
Pick<User, "id" | "name">     // Select fields
Omit<User, "id">              // Exclude fields
Partial<User>                 // All optional
Required<User>                // All required
Readonly<User>               // All readonly
Record<string, User>          // Object type
Extract<Union, "a" | "b">    // Extract from union
Exclude<Union, "a">          // Exclude from union
NonNullable<T | null>         // Remove null/undefined
ReturnType<typeof fn>         // Function return type
Parameters<typeof fn>         // Function params tuple
```

### Type Guards

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  );
}
```

### Import Types

```typescript
import type { User } from "./types";
import { createUser, type Config } from "./utils";
```

---

## Imports

### Order and Grouping
Order imports by: external libs → internal modules → relative paths

```typescript
// 1. External libraries
import { Request, Response } from 'express';
import { hash } from 'bcrypt';

// 2. Internal modules (from application/, domain/)
import { Role, User, UserProps } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IEventPublisher } from '../../ports/IEventPublisher';
import { UserCreatedEvent } from '../../../domain/events/UserCreatedEvent';

// 3. Relative paths (same layer)
import { RegisterUserRequest, UserResponse } from '../../dtos/RegisterUser.dto';
import { UserAlreadyExistsError } from '../../../domain/errors/DomainError';
```

---

## Dependency Injection

### Constructor Injection with private readonly
```typescript
export class RegisterUserUseCase {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly registrationStrategies: Map<string, RegistrationStrategy>,
  ) {}

  public async execute(request: RegisterUserRequest): Promise<UserResponse> {
    // implementation
  }
}
```

### Define Interfaces in Ports
- Repository interfaces → `domain/repositories/`
- Service interfaces → `application/ports/`
- Use suffix `I` for interfaces: `IUserRepository`, `ITokenService`

### Hexagonal Architecture Pattern

This service follows **Hexagonal Architecture** (Ports & Adapters):

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                    (Use Cases, DTOs, Strategies)                │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                        DOMAIN LAYER                            │
│              (Entities, Events, Repository Ports)               │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Repository Ports  │    │         Entities             │ │
│  │  (Interfaces/Defs)  │    │   (Business Logic/Aggregates) │ │
│  │ - IUserRepository   │    │   - User                     │ │
│  │ - IAccountRepository│    │   - Account                  │ │
│  │ - IOAuthUserRepo    │    │                              │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                    INFRASTRUCTURE LAYER                        │
│                   (Adapters, Implementations)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Database Adapters                      │  │
│  │  - DrizzleUserAdapter    (implements IUserRepository)  │  │
│  │  - OAuthUserAdapter      (implements IOAuthUserRepository)│ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Service Adapters                      │  │
│  │  - JwtTokenProvider     (implements ITokenProvider)     │  │
│  │  - NodemailerService   (implements IEmailService)       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Conventions:**
- Ports (interfaces) live in `domain/repositories/`
- Adapters (implementations) live in `infrastructure/database/repositories/`
- Use **Adapter** suffix for implementations: `XxxAdapter`
- Application ports (`application/ports/`) re-export from domain for backward compatibility
- DI container maps ports to adapters in `infrastructure/DI/container.ts`

---

## Error Handling

### Use Custom Domain Errors
All errors extend from `DomainError` in `domain/errors/DomainError.ts`:

```typescript
// Base error class
export class DomainError extends Error {
  public readonly suggestedHttpCode: number;

  constructor(
    message: string,
    suggestedHttpCode: number = 500,
    name: string = 'DomainError'
  ) {
    super(message);
    this.name = name;
    this.suggestedHttpCode = suggestedHttpCode;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

// Custom errors
export class UserNotFoundError extends DomainError {
  constructor(message: string = 'User not found') {
    super(message, 404, 'UserNotFoundError');
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(message: string = 'User already exists with that email') {
    super(message, 409, 'UserAlreadyExistsError');
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}
```

### Throw with Context
```typescript
throw new UserAlreadyExistsError(`Email ${email} is already registered.`);
```

---

## JSDoc Comments

### Document All Public Classes and Methods

```typescript
/**
 * @class RegisterUserUseCase
 * @description Caso de uso para registrar nuevos usuarios en la plataforma.
 * Orquesta la validación, persistencia, aplicación del Template Method (estrategia)
 * y la publicación del evento de dominio.
 * @author Petpay Architecture Team
 * @version 1.0
 * @since 2025-01-01
 */
export class RegisterUserUseCase {
  /**
   * Ejecuta el caso de uso de registro de usuario.
   * @param {RegisterUserRequest} request - Datos del usuario a registrar.
   * @returns {Promise<UserResponse>} Respuesta con datos esenciales del usuario creado.
   * @throws {UserAlreadyExistsError} Si el email ya está registrado.
   * @throws {Error} Si la estrategia de registro es inválida.
   */
  public async execute(request: RegisterUserRequest): Promise<UserResponse> {
    // implementation
  }
}
```

---

## Validation (Zod)

### Define Schemas in infrastructure/http/validation/zod-schemas/
```typescript
// register-schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'SERVICE_PROVIDER']),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
```

---

## Domain Events

### Create Events in domain/events/
```typescript
// UserCreatedEvent.ts
export interface UserCreatedEventPayload {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
}

export class UserCreatedEvent {
  public readonly name = 'user.created';
  public readonly payload: UserCreatedEventPayload;

  constructor(payload: UserCreatedEventPayload) {
    this.payload = payload;
  }
}
```

---

## Entities (Domain)

### Use Aggregate Root Pattern
```typescript
// domain/entities/User.ts
export interface UserProps {
  id?: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: Role[];
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  public readonly id: number | undefined;
  public email: string;
  public passwordHash: string;
  // ... other fields

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email.toLowerCase();
    // ...
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new Error('User must have a valid email address');
    }
    // ... other invariants
  }

  public hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }
}
```

---

## Database (Drizzle ORM)

### Schema Definition
```typescript
// infrastructure/database/drizzle/schema.ts
import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  roles: varchar('roles', { length: 255 }).notNull(), // JSON array as string
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## Middlewares

### Error Handler
```typescript
// infrastructure/http/middlewares/error.handler.ts
import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../domain/errors/DomainError';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof DomainError) {
    return res.status(err.suggestedHttpCode).json({
      error: err.name,
      message: err.message,
    });
  }

  // Unknown error
  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}
```

### Auth Middleware
```typescript
// infrastructure/http/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { JwtTokenProvider } from '../../services/JwtTokenProvider';

export function authMiddleware(jwtService: JwtTokenProvider) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    try {
      const payload = jwtService.verify(token);
      (req as any).user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
```

---

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test auth.test.ts

# Run tests with coverage
bun test --coverage
```

---

## Git Conventions

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `chore:` Maintenance
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests

Examples:
```
feat(identity): add user registration endpoint
fix(identity): resolve JWT token expiration issue
refactor(identity): extract validation to middleware
```

---

## Environment Variables

Create `.env` file (never commit):
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/petpay_identity

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=your-domain.com

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
```
