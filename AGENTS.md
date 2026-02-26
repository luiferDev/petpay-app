# AGENTS.md - Petpay-app Agent Guidelines

This is the main index file for the Petpay-app monorepo. Each service has its own detailed AGENTS.md with specific guidelines.

---

## Project Overview

**Petpay-app** is a monorepo containing three microservices for a pet-related marketplace platform:

| Service | Location | Technology | Database |
|---------|----------|-----------|----------|
| **Identity** | `Identity/` | TypeScript / Bun / Express / Drizzle | PostgreSQL |
| **Marketplace** | `marketplace/` | Go / Gin / GORM | PostgreSQL |
| **Catalog & Offers** | `catalog-&-offers/` | Go / Gin / GORM | PostgreSQL |

---

## Quick Reference Commands

### Identity Service (TypeScript/Bun)
```bash
cd Identity

# Install dependencies
bun install

# Run development server
bun run dev

# Lint code
bun run lint

# Lint and auto-fix
bun run lint:fix

# Run tests
bun test

# Run single test
bun test auth.test.ts

# Database migrations
bunx drizzle-kit generate
bunx drizzle-kit push
```

### Go Services (Marketplace & Catalog)
```bash
cd marketplace  # or catalog-&-offers

# Download dependencies
go mod download

# Build
go build -o bin/service ./cmd/main.go

# Run
go run ./cmd/main.go

# Run all tests
go test ./...

# Run single test
go test -v -run TestFunctionName ./internal/application

# Lint (install golangci-lint first)
golangci-lint run

# Format code
go fmt ./...
```

---

## Architecture Patterns

### Identity Service (Clean Architecture)
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

## Common Patterns

### Naming Conventions

| Element | Identity (TS) | Go Services |
|---------|---------------|-------------|
| Files | kebab-case (`auth-controller.ts`) | snake_case (`order_service.go`) |
| Classes/Types | PascalCase (`UserService`) | PascalCase (`OrderService`) |
| Functions/Variables | camelCase (`getUserById`) | camelCase (`getOrderById`) |
| Constants | SCREAMING_SNAKE_CASE | PascalCase (exported), camelCase (unexported) |
| Database columns | snake_case | snake_case |
| JSON fields | camelCase | camelCase |

### Error Handling

**TypeScript (Identity)**:
- Use custom DomainError classes extending base Error
- Include `suggestedHttpCode` for HTTP status mapping

**Go**:
- Return errors explicitly with `fmt.Errorf` and `%w` wrapping
- Use custom error types or error variables

### Dependency Injection

**TypeScript**: Use tsyringe with constructor injection
```typescript
constructor(
  private readonly userRepository: IUserRepository,
  private readonly eventPublisher: IEventPublisher,
) {}
```

**Go**: Manual dependency injection via constructors
```go
func NewOrderService(repo repository.OrderRepository) *OrderServiceImpl {
    return &OrderServiceImpl{repo: repo}
}
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

## Environment Variables

Create `.env` files (never commit to git):

### Identity Service
```env
DATABASE_URL=postgresql://user:password@localhost:5432/petpay_identity
JWT_SECRET=your-secret-key
RABBITMQ_URL=amqp://localhost:5672
```

### Go Services
```env
DATABASE_URL=postgresql://user:password@localhost:5432/petpay_marketplace
PORT=8080
```

---

## Service-Specific Guidelines

For detailed guidelines, code style, and architecture for each service, see:

- **Identity**: [`Identity/AGENTS.md`](Identity/AGENTS.md)
- **Marketplace**: [`marketplace/AGENTS.md`](marketplace/AGENTS.md)
- **Catalog & Offers**: [`catalog-&-offers/AGENTS.md`](catalog-&-offers/AGENTS.md)

---

## General Best Practices

1. **Never commit secrets** - Use `.env` files, never commit credentials
2. **Run linter before committing** - `bun run lint` / `golangci-lint run`
3. **Use meaningful names** - Avoid single letters except in loops
4. **Keep functions small** - Single responsibility principle
5. **Write tests** - Add test files for new features
6. **Document complex logic** - JSDoc for TypeScript, comments for Go
7. **Follow existing patterns** - Match the codebase's established conventions
