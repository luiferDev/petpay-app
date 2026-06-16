# AGENTS.md - Petpay-app Agent Guidelines

Monorepo: Identity (TS/Bun, :3000), Marketplace (Go, :8080), Catalog (Go, :8081), Payments (Rust/Axum, :8082).

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

### Payments Service (Rust/Axum)
```bash
cd payments-service
cargo run                              # Run development
cargo build                            # Compile
cargo test                             # Run all tests
cargo fmt                              # Format code
cargo clippy                           # Run linter
```

---

## Naming Conventions

| Element | Identity (TS) | Go Services | Payments (Rust) |
|---------|---------------|-------------|-----------------|
| Files | kebab-case | snake_case | snake_case |
| Classes/Types | PascalCase | PascalCase | PascalCase |
| Functions/Variables | camelCase | camelCase | snake_case |
| Constants | SCREAMING_SNAKE | PascalCase (exported), camelCase (unexported) | SCREAMING_SNAKE |
| DB/JSON | snake_case | snake_case / camelCase | snake_case |

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

- **ORM**: Drizzle (Identity), GORM (Go services), SeaORM (Payments)
- **Migrations**: Drizzle Kit (Identity), GORM AutoMigrate (Go), SeaSchema (Payments)
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
- **Payments**: `payments-service/AGENTS.md` - Hexagonal, Axum, SeaORM, Tokio

---

## Testing

### Identity (TypeScript/Bun)
```bash
bun test                              # Run all tests
bun test auth.test.ts                 # Run single test file (exact match)
bun test auth                         # Run all files matching "auth"
bun test --coverage                   # Run with coverage
bun test --watch                     # Watch mode
```

### Go Services
```bash
go test ./...                         # Run all tests
go test -v ./internal/...             # Verbose output
go test -v -run TestName ./path      # Run tests matching regex
go test -v -run "^TestCreate$" .     # Run exact test name
go test -cover ./...                 # Test + coverage
go test -coverprofile=coverage.out ./...  # Generate coverage file
go test -race ./...                  # Run with race detector
```

### Payments (Rust/Axum)
```bash
cargo test                             # Run all tests
cargo test --lib                      # Library tests only
cargo test --test payment_entity_test # Run specific test file
cargo test -- --nocapture            # Show output
cargo clippy                          # Linter
```

---

## RabbitMQ Patterns

### Publisher (from Identity)
```typescript
// Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts
export class RabbitMQEventPublisher implements IEventPublisher {
  async publish(event: DomainEvent): Promise<void> {
    const channel = await this.connection.createChannel();
    await channel.assertExchange('petpay.events', 'topic', { durable: true });
    
    const routingKey = `booking.${event.getEventType()}`;
    channel.publish('petpay.events', routingKey, Buffer.from(JSON.stringify(event)));
  }
}
```

### Consumer (Go)
```go
func (p *RabbitMQPublisher) Subscribe(queue string, handler func(msg amqp091.Delivery)) error {
    ch, err := p.channel.QueueDeclare(queue, true, false, false, false, nil)
    if err != nil { return err }
    
    msgs, err := ch.Consume(queue, "", false, false, false, false, nil)
    go func() {
        for d := range msgs {
            handler(d)
        }
    }()
    return nil
}
```

---

## Service Communication

### REST (Service-to-Service)
```go
// Internal HTTP client for calling other services
type IdentityEmailClient struct {
    baseURL string
    apiKey  string
    client  *http.Client
}

func (c *IdentityEmailClient) SendEmail(ctx context.Context, req *EmailRequest) error {
    jsonData, _ := json.Marshal(req)
    httpReq, _ := http.NewRequestWithContext(ctx, "POST", 
        c.baseURL+"/api/v1/emails/send", bytes.NewBuffer(jsonData))
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
    
    resp, err := c.client.Do(httpReq)
    if err != nil { return err }
    defer resp.Body.Close()
    return nil
}
```

### Authentication Between Services
- Use API key in `Authorization: Bearer <key>` header
- Or JWT with service-level claims
- Never hardcode secrets - use environment variables

---

## Concurrency Patterns

### Goroutines for Async Operations
```go
func (s *BookingService) CreateBookingAsync(ctx context.Context, req *CreateRequest) (*Booking, error) {
    booking, err := s.repo.Create(ctx, req)
    if err != nil { return nil, err }
    
    // Fire and forget - don't block response
    go func() {
        s.publisher.Publish(ctx, event)   // Errors logged only
    }()
    
    go func() {
        s.emailClient.SendEmail(ctx, email) // Errors logged only
    }()
    
    return booking, nil
}
```

### Worker Pool Pattern
```go
func NewWorkerPool(workers int, handler func(job Job)) *WorkerPool {
    jobs := make(chan Job, workers)
    pool := &WorkerPool{jobs: jobs}
    
    for i := 0; i < workers; i++ {
        go func() {
            for job := range jobs {
                handler(job)
            }
        }()
    }
    return pool
}
```

---

## Docker & Deployment

### Docker Compose Pattern
```yaml
services:
  bookings:
    build: ./bookings-service
    ports:
      - "8082:8082"
    environment:
      - CONFIG_PATH=/app/config.yaml
    depends_on:
      - postgres
      - rabbitmq
    volumes:
      - ./bookings-service/config.yaml:/app/config.yaml:ro

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: petpay
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"  # Management UI
```

### Health Checks
```go
func healthHandler(c *gin.Context) {
    c.JSON(200, gin.H{
        "status": "healthy",
        "service": "bookings",
    })
}

// In router
router.GET("/health", healthHandler)
```

---

## Error Handling Patterns

### Go Errors with Wrapping
```go
func (s *Service) Operation() error {
    result, err := s.repo.Find(id)
    if err != nil {
        return fmt.Errorf("failed to find entity %s: %w", id, err)
    }
    if result == nil {
        return fmt.Errorf("entity not found: %s", id)
    }
    return nil
}
```

### Custom Error Types
```go
type DomainError struct {
    Code    string
    Message string
    Status  int
}

func (e *DomainError) Error() string {
    return e.Message
}

func NewNotFoundError(resource, id string) *DomainError {
    return &DomainError{
        Code:    "NOT_FOUND",
        Message: fmt.Sprintf("%s not found: %s", resource, id),
        Status:  404,
    }
}
```

---

## Best Practices

1. Never commit secrets - Use `.env` files
2. Run linter before committing
3. Use meaningful names - Avoid single letters except loops
4. Keep functions small - Single responsibility
5. Write tests for new features
6. Document complex logic
7. Follow existing patterns
8. Use context.Context for all DB/HTTP operations
9. Handle errors at every layer - don't ignore errors
10. Use transactions for multi-step operations

---

## Skills System

Este proyecto usa un sistema de **skills** (habilidades) que proporcionan patrones, convenciones y mejores prácticas específicas para cada tecnología. Las skills se cargan automáticamente según el contexto del código que se está escribiendo.

### Estructura de Skills

```
~/.opencode/skills/                    # Skills globales (disponibles en todos los proyectos)
├── sdd-*/                            # SDD workflow (spec-driven development)
├── golang-*/                         # Go patterns
├── react-19/                         # React 19
├── angular-*/                        # Angular
├── typescript/                       # TypeScript strict
├── pytest/                           # Python testing
├── playwright/                       # E2E testing
└── ... (muchos más)

.petpay-app/.agents/skills/           # Skills específicos del proyecto
├── rust-*/                          # Rust patterns (best-practices, system-event-driven, etc.)
├── kubernetes-*/                    # Kubernetes patterns
└── ... (muchos más)

skills-lock.json                       # Registry de skills activos
```

### Cómo Funciona

Cuando detectas que el trabajo involucra una tecnología específica, **la skill se carga automáticamente**. Por ejemplo:

| Contexto detectado | Skill que se carga |
|-------------------|-------------------|
| Escribiendo tests en Go | `golang-testing` |
| Trabajando con React 19 | `react-19` |
| Construyendo API con Gin | `golang-gin-api` |
| Escribiendo TypeScript | `typescript` |
| Workflow SDD | `sdd-*` (varias) |
| Testing Identity (TS/Bun) | `identity-testing` |

### SDD Workflow (Spec-Driven Development)

El proyecto usa SDD para cambios sustanciales. Los comandos disponibles:

```bash
/sdd-init              # Inicializar estructura openspec/
/sdd-explore <topic>   # Investigar antes de comprometer
/sdd-new <change>      # Crear nuevo cambio (explore + propose)
/sdd-propose          # Crear propuesta
/sdd-spec              # Escribir especificaciones
/sdd-design           # Diseño técnico
/sdd-tasks            # Dividir en tareas
/sdd-apply            # Implementar tareas
/sdd-verify           # Verificar implementación
/sdd-archive          # Archivar cambio completado
```

### Skills por Microservicio

#### Identity (TypeScript/Bun)
- **Skill principal**: `identity-testing` - Testing patterns con bun:test
- **Usa**: `typescript`, `zod-4`

#### Marketplace & Catalog (Go)
- **Skill principal**: `golang-testing`, `golang-gin-api`, `golang-patterns`
- **Usa**: Testing, API patterns, concurrency

#### Payments (Rust/Axum)
- **Skills disponibles en el proyecto**:
  - `rust-best-practices` - Convenciones y patterns
  - `rust-system-event-driven` - Eventos y concurrencia
  - `rust-errors` - Manejo de errores
  - `rust-backend` - Patterns para backends
  - `rust-expert-best-practices-code-review` - Code review rules
- **Globales útiles**: `golang-patterns` (para patrones arquitectónicos)

### Cómo Usar Skills Manualmente

Si necesitas cargar una skill específica:

```
1. El sistema detecta el contexto automáticamente
2. Si no, puedes invocar la skill con el comando apropiado
3. La skill inyecta instrucciones detalladas en el contexto
```

### Actualizar Registry de Skills

Si agregas o remueves skills en el proyecto:

```bash
# El sistema actualiza automáticamente el registry
# O manualmente:
# Busca en .agents/skills/ y ~/.opencode/skills/
```

El archivo `skills-lock.json` mantiene el registro de skills disponibles y sus ubicaciones.

### Mejores Prácticas con Skills

1. **No ignores las instrucciones de la skill** - Están basadas en convenciones probadas
2. **Carga la skill apropiada** antes de escribir código significativo
3. **Usa SDD** para features sustanciales, no solo código inline
4. **Consulta la skill** cuando tengas dudas de patrones específicos
5. **Mantén el registry actualizado** si agregas skills custom al proyecto
