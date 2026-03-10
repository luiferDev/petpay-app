# AGENTS.md - Petpay-app Agent Guidelines

Monorepo: Identity (TS/Bun, :3000), Marketplace (Go, :8080), Catalog (Go, :8081).

---

## Commands

### Identity (TypeScript/Bun)
```bash
cd Identity
bun install                    # Install dependencies
bun run dev                   # Run development (watch mode)
bun run lint                  # Lint (ts-standard)
bun run lint:fix              # Lint + auto-fix
bun test                      # Run all tests
bun test auth.test.ts         # Run single test file
bun test --coverage           # Run with coverage
bunx drizzle-kit generate     # Generate migrations
bunx drizzle-kit push         # Push migrations to DB
```

### Go Services (Marketplace & Catalog)
```bash
cd marketplace  # or catalog-&-offers
go mod download; go build -o bin/service ./cmd/main.go  # Install + build
go run ./cmd/main.go             # Run development
go test ./...                   # Run all tests
go test -v -run TestName ./path # Run single test (REGEX)
go test -v -run "^TestCreate$" .# Run exact test name
go test -cover ./...            # Test + coverage
go fmt ./...; go mod tidy       # Format + tidy
golangci-lint run              # Lint
```

---

## Naming Conventions

| Element | Identity (TS) | Go Services |
|---------|---------------|-------------|
| Files | kebab-case | snake_case |
| Classes/Types | PascalCase | PascalCase |
| Functions/Variables | camelCase | camelCase |
| Constants | SCREAMING_SNAKE | PascalCase (exported), camelCase (unexported) |
| DB/JSON | snake_case | snake_case / camelCase |

---

## TypeScript Guidelines

### Explicit Types (REQUIRED)
```typescript
public async execute(request: RegisterUserRequest): Promise<UserResponse> {
  const user: User = await this.userRepository.findById(id);
  return user;
}
// ❌ Bad - never omit types
public async execute(request) { const user = await this.userRepository.findById(id); }
```

### Const Types Pattern (REQUIRED)
```typescript
const STATUS = { ACTIVE: "active", INACTIVE: "inactive" } as const;
type Status = (typeof STATUS)[keyof typeof STATUS];
// ❌ Bad - duplicate values
type Status = "active" | "inactive";
```

### Interfaces vs Types, readonly, Never Use `any`
```typescript
interface UserProps { id?: number; email: string; }
type Role = 'USER' | 'ADMIN' | 'SERVICE_PROVIDER';
export class User { public readonly id: number | undefined; }
function parse(input: unknown): User { /* ... */ }
```

---

## Go Guidelines

### Struct Tags
```go
type Order struct {
    gorm.Model
    OrderNumber uint64 `gorm:"column:order_number" json:"orderNumber"`
    CustomerId  string `gorm:"column:customer_id; index" json:"customerId"`
}
```

### Return Errors Explicitly
```go
func (s *OrderServiceImpl) GetOrderById(id string) (*core.Order, error) {
    order, err := s.repo.FindById(id)
    if err != nil { return nil, fmt.Errorf("failed to get order %s: %w", id, err) }
    return order, nil
}
```

---

## Imports

### TypeScript: external → internal → relative
```typescript
import { Request, Response } from 'express';
import { User } from '../../../domain/entities/User';
import { RegisterUserRequest } from '../../dtos/RegisterUser.dto';
```

### Go: stdlib → external → internal
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

### TypeScript
```typescript
export class DomainError extends Error {
  public readonly suggestedHttpCode: number;
  constructor(message: string, suggestedHttpCode = 500, name = 'DomainError') {
    super(message); this.name = name; this.suggestedHttpCode = suggestedHttpCode;
  }
}
export class UserNotFoundError extends DomainError {
  constructor(message = 'User not found') { super(message, 404, 'UserNotFoundError'); }
}
```

---

## Dependency Injection

### TypeScript (tsyringe)
```typescript
constructor(
  private readonly userRepository: IUserRepository,
  private readonly eventPublisher: IEventPublisher,
) {}
```

### Go (Manual via Constructors)
```go
func NewOrderService(repo repository.OrderRepository) *OrderServiceImpl {
    return &OrderServiceImpl{repo: repo}
}
```

---

## Database

- **ORM**: Drizzle (Identity), GORM (Go services)
- **Migrations**: Drizzle Kit (Identity), GORM AutoMigrate (Go)
- **Env**: Use `.env` files (never commit secrets)

---

## Git Conventions

```
feat(identity): add user registration endpoint
fix(marketplace): resolve order status update bug
refactor(catalog): extract product service interface
```

---

## Service-Specific Guidelines

- **Identity**: `Identity/AGENTS.md` - Clean Architecture, Drizzle, Zod, const types
- **Marketplace**: `marketplace/AGENTS.md` - Hexagonal, GORM, ports/adapters
- **Catalog**: `catalog-&-offers/AGENTS.md` - Hexagonal with adapters

---

## Best Practices

1. Never commit secrets - Use `.env` files
2. Run linter before committing
3. Use meaningful names - Avoid single letters except loops
4. Keep functions small - Single responsibility
5. Write tests for new features
6. Document complex logic
7. Follow existing patterns
