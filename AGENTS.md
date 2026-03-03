# AGENTS.md - Petpay-app Agent Guidelines

This is the main index file for the Petpay-app monorepo containing three microservices.

---

## Project Overview

| Service | Location | Technology | Database | Port |
|---------|----------|------------|----------|------|
| **Identity** | `Identity/` | TypeScript / Bun / Express / Drizzle | PostgreSQL | 3000 |
| **Marketplace** | `marketplace/` | Go / Gin / GORM | PostgreSQL | 8080 |
| **Catalog & Offers** | `catalog-&-offers/` | Go / Gin / GORM | PostgreSQL | 8081 |

---

## Quick Reference Commands

### Identity Service (TypeScript/Bun)
```bash
cd Identity
bun install                    # Install dependencies
bun run dev                    # Run development (watch mode)
bun run start                  # Start production server
bun run lint                   # Lint code (ts-standard)
bun run lint:fix               # Lint and auto-fix
bun test                       # Run all tests
bun test auth.test.ts          # Run single test file
bun test --coverage            # Run with coverage
bunx drizzle-kit generate      # Generate migrations
bunx drizzle-kit push          # Push migrations to DB
```

### Go Services (Marketplace & Catalog)
```bash
cd marketplace  # or catalog-&-offers
go mod download                  # Download dependencies
go build -o bin/service ./cmd/main.go  # Build
go run ./cmd/main.go             # Run development
go test ./...                    # Run all tests
go test -v -run TestName ./path   # Run single test
go test -cover ./...             # Run with coverage
golangci-lint run                # Lint (install first)
go fmt ./...                     # Format code
go mod tidy                      # Tidy dependencies
```

---

## Architecture Patterns

### Identity (Clean Architecture)
```
src/
├── application/     # Use cases, DTOs, strategies, ports
├── domain/          # Entities, errors, events, repository interfaces
├── infrastructure/ # Controllers, services, DB, DI
└── shared/         # Utilities
```

### Go Services (Hexagonal Architecture)
```
internal/
├── application/     # Core domain, ports, services
└── infrastructure/ # Controllers, repositories, DB
```

---

## Code Style Guidelines

### Naming Conventions

| Element | Identity (TS) | Go Services |
|---------|---------------|-------------|
| Files | kebab-case (`auth-controller.ts`) | snake_case (`order_service.go`) |
| Classes/Types | PascalCase (`UserService`) | PascalCase (`OrderService`) |
| Functions/Variables | camelCase (`getUserById`) | camelCase (`getOrderById`) |
| Constants | SCREAMING_SNAKE_CASE | PascalCase (exported), camelCase (unexported) |
| Database columns | snake_case | snake_case |
| JSON fields | camelCase | camelCase |

### TypeScript Specific

**Always Use Explicit Types:**
```typescript
// ✅ Good
public async execute(request: RegisterUserRequest): Promise<UserResponse> {
  const user: User = await this.userRepository.findById(id);
  return user;
}

// ❌ Bad - never omit types
public async execute(request) {
  const user = await this.userRepository.findById(id);
  return user;
}
```

**Prefer Interfaces for Objects, Types for Unions:**
```typescript
interface UserProps { id?: number; email: string; }
type Role = 'USER' | 'ADMIN' | 'SERVICE_PROVIDER';
```

**Use readonly for Immutable Data:**
```typescript
export class User {
  public readonly id: number | undefined;
}
```

### Go Specific

**Struct Tags for GORM/JSON:**
```go
type Order struct {
    gorm.Model
    OrderNumber  uint64  `gorm:"column:order_number" json:"orderNumber"`
    CustomerId   string  `gorm:"column:customer_id; index" json:"customerId"`
}
```

---

## Imports

### TypeScript (Identity)
Order imports by: external libs → internal modules → relative paths
```typescript
// 1. External libraries
import { Request, Response } from 'express';

// 2. Internal modules (from application/, domain/)
import { User } from '../../../domain/entities/User';

// 3. Relative paths (same layer)
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto';
```

### Go
Order imports by: standard lib → external packages → internal packages
```go
import (
    "fmt"
    "net/http"
    "github.com/gin-gonic/gin"
    "petpay/marketplace-service/internal/application/core"
)
```

---

## Error Handling

### TypeScript: Custom Domain Errors
```typescript
export class DomainError extends Error {
  public readonly suggestedHttpCode: number;
  constructor(message: string, suggestedHttpCode = 500, name = 'DomainError') {
    super(message);
    this.name = name;
    this.suggestedHttpCode = suggestedHttpCode;
  }
}

export class UserNotFoundError extends DomainError {
  constructor(message = 'User not found') {
    super(message, 404, 'UserNotFoundError');
  }
}
```

### Go: Return Errors Explicitly
```go
func (s *OrderServiceImpl) GetOrderById(id string) (*core.Order, error) {
    order, err := s.repo.FindById(id)
    if err != nil {
        return nil, fmt.Errorf("failed to get order %s: %w", id, err)
    }
    return order, nil
}
```

---

## Dependency Injection

### TypeScript: tsyringe with Constructor Injection
```typescript
constructor(
  private readonly userRepository: IUserRepository,
  private readonly eventPublisher: IEventPublisher,
) {}
```

### Go: Manual DI via Constructors
```go
func NewOrderService(repo repository.OrderRepository) *OrderServiceImpl {
    return &OrderServiceImpl{repo: repo}
}
```

---

## Testing Patterns

### TypeScript (bun:test)
```bash
bun test                                    # Run all
bun test auth.test.ts                       # Single file
bun test --coverage                         # With coverage
```

### Go
```bash
go test ./...                               # Run all
go test -v -run TestCreateOrder ./internal/application  # Single test
go test -cover ./...                        # With coverage
```

---

## Database

- **ORM**: Drizzle (Identity), GORM (Go services)
- **Migrations**: Drizzle Kit (Identity), GORM AutoMigrate (Go)
- All services use PostgreSQL
- Environment variables in `.env` files (never commit secrets)

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
fix(marketplace): resolve order status update bug
refactor(catalog): extract product service interface
```

---

## Service-Specific Guidelines

For detailed guidelines per service, see:
- **Identity**: [`Identity/AGENTS.md`](Identity/AGENTS.md) - Clean Architecture, Drizzle, Zod
- **Marketplace**: [`marketplace/AGENTS.md`](marketplace/AGENTS.md) - Hexagonal, GORM
- **Catalog**: [`catalog-&-offers/AGENTS.md`](catalog-&-offers/AGENTS.md) - Hexagonal with adapters

---

## General Best Practices

1. **Never commit secrets** - Use `.env` files, never commit credentials
2. **Run linter before committing** - `bun run lint` / `golangci-lint run`
3. **Use meaningful names** - Avoid single letters except in loops
4. **Keep functions small** - Single responsibility principle
5. **Write tests** - Add test files for new features
6. **Document complex logic** - JSDoc for TypeScript, comments for Go
7. **Follow existing patterns** - Match the codebase's established conventions
