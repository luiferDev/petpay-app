# AGENTS.md - Payments Service Guidelines

Rust/Axum microservice for Payment & Invoice management.

---

## Commands

### Payments Service (Rust/Axum)
```bash
cd payments-service

# Development
cargo run                              # Run development server
cargo run --release                    # Run in release mode

# Build & Test
cargo build                            # Compile
cargo build --release                  # Release build
cargo test                             # Run all tests
cargo test --lib                       # Run library tests only
cargo test --test payment_entity_test  # Run specific test file

# Linting & Formatting
cargo fmt                              # Format code
cargo fmt -- --check                   # Check formatting without modifying
cargo clippy                           # Run linter
cargo clippy -- -D warnings            # Treat warnings as errors

# Database
cargo run -- migrate                   # Run migrations
cargo run -- seed                      # Seed database with test data
```

---

## Project Structure

```
payments-service/
├── src/
│   ├── main.rs                        # Entry point, Axum server setup
│   ├── lib.rs                         # Library root, module exports
│   ├── domain/                        # Domain entities & errors
│   │   ├── entities/
│   │   │   ├── payment.rs
│   │   │   ├── invoice.rs
│   │   │   └── coupon.rs
│   │   └── errors.rs                  # Domain errors
│   ├── ports/                         # Interfaces (Hexagonal ports)
│   │   ├── repository/                # Data access interfaces
│   │   │   ├── payment_repository.rs
│   │   │   ├── invoice_repository.rs
│   │   │   └── coupon_repository.rs
│   │   └── services/                  # External service interfaces
│   │       ├── payment_provider.rs
│   │       ├── email_sender.rs
│   │       └── order_validator.rs
│   ├── application/                   # Use cases (Commands & Queries)
│   │   ├── commands/
│   │   │   ├── process_payment.rs
│   │   │   ├── refund_payment.rs
│   │   │   ├── apply_coupon.rs
│   │   │   └── validate_coupon.rs
│   │   ├── queries/
│   │   │   ├── get_payment.rs
│   │   │   ├── list_payments.rs
│   │   │   ├── get_invoice.rs
│   │   │   ├── list_invoices.rs
│   │   │   └── get_invoice_pdf.rs
│   │   └── dto/                       # Data transfer objects
│   └── infrastructure/                # Implementations (Adapters)
│       ├── database/
│       │   ├── models/                # SeaORM entities
│       │   ├── repositories/         # Repository implementations
│       │   └── migrations/           # Database migrations
│       ├── http/
│       │   ├── handlers/             # Axum handlers
│       │   └── middleware/          # HTTP middleware
│       ├── payment/                  # Payment provider implementations
│       ├── email/                    # Email service implementations
│       ├── pdf/                      # PDF generation
│       ├── validators/              # External service validators
│       └── config.rs                 # Configuration
└── tests/                            # Integration tests
```

---

## Naming Conventions (Rust)

| Element | Convention | Example |
|---------|------------|---------|
| Files | snake_case | `payment_repository.rs` |
| Modules | snake_case | `pub mod payment_repository;` |
| Structs/Enums | PascalCase | `struct PaymentProcessor` |
| Functions | snake_case | `fn process_payment()` |
| Variables | snake_case | `let mut payment_amount` |
| Constants | SCREAMING_SNAKE | `const MAX_AMOUNT: f64 = 10000.0;` |
| Traits | PascalCase | `trait PaymentProvider` |
| DB/JSON | snake_case | `#[sea_orm(column_name = "payment_id")]` |

---

## Rust Guidelines

### Explicit Types (REQUIRED)
```rust
// ✅ ALWAYS: Explicit return types
fn get_payment(id: i64) -> Result<Payment, PaymentError> {
    let payment: Payment = self.repository.find_by_id(id).await?;
    Ok(payment)
}

// ❌ NEVER: Inferred types in public APIs
fn get_payment(id: i64) -> Result<_, _> { ... }
```

### Error Handling with `thiserror`
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PaymentError {
    #[error("payment not found: {0}")]
    NotFound(i64),
    
    #[error("invalid payment amount: {0}")]
    InvalidAmount(f64),
    
    #[error("payment provider error: {0}")]
    ProviderError(String),
    
    #[error("database error: {0}")]
    DatabaseError(#[from] DbError),
}
```

### Result Alias Pattern
```rust
// Define a Result type alias for the module
pub type Result<T> = std::result::Result<T, PaymentError>;

pub fn process_payment(amount: f64) -> Result<Payment> {
    if amount <= 0.0 {
        return Err(PaymentError::InvalidAmount(amount));
    }
    // ...
}
```

### SeaORM Model Syntax
```rust
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, DeriveEntityModel, Eq, PartialEq)]
#[sea_orm(table_name = "payments")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "id")]
    pub id: i64,
    
    #[sea_orm(column_name = "order_id")]
    pub order_id: String,
    
    #[sea_orm(column_name = "amount")]
    pub amount: f64,
    
    #[sea_orm(column_name = "currency")]
    pub currency: String,
    
    #[sea_orm(column_name = "status")]
    pub status: String,
    
    #[sea_orm(column_name = "created_at")]
    pub created_at: DateTime<Utc>,
    
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}
```

---

## Axum Handler Pattern

### Thin Handler - Delegate to Application Layer
```rust
// infrastructure/http/handlers/payment.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::Serialize;

use crate::application::commands::process_payment::{ProcessPaymentCommand, ProcessPaymentCommandHandler};
use crate::application::dto::CreatePaymentRequest;

pub async fn create_payment(
    State(handler): State<ProcessPaymentCommandHandler>,
    Json(req): Json<CreatePaymentRequest>,
) -> Result<Json<PaymentResponse>, StatusCode> {
    handler.execute(req).await.map_err(|e| e.status_code())
}

pub async fn get_payment(
    Path(id): Path<i64>,
    State(handler): State<GetPaymentQueryHandler>,
) -> Result<Json<PaymentResponse>, StatusCode> {
    handler.execute(id).await.map_err(|e| e.status_code())
}
```

### State Management with Arc
```rust
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub payment_handler: ProcessPaymentCommandHandler,
    pub query_handler: GetPaymentQueryHandler,
    // ...
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/payments", post(create_payment))
        .route("/payments/:id", get(get_payment))
        .with_state(Arc::new(state))
}
```

---

## Imports Organization

### Rust: stdlib → external → internal
```rust
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::application::commands::process_payment::ProcessPaymentCommandHandler;
use crate::domain::entities::Payment;
use crate::ports::repository::PaymentRepository;
```

---

## Dependency Injection (Manual via Constructors)

```rust
// Repository trait (port)
pub trait PaymentRepository: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<Payment>, DbError>;
    async fn create(&self, payment: Payment) -> Result<Payment, DbError>;
    async fn update(&self, payment: Payment) -> Result<Payment, DbError>;
}

// Repository implementation (adapter)
pub struct SeaOrmPaymentRepository {
    db: DatabaseConnection,
}

impl SeaOrmPaymentRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

// Service uses trait (dependency inversion)
pub struct PaymentService<R: PaymentRepository> {
    repository: R,
}

impl<R: PaymentRepository> PaymentService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}
```

---

## Async Patterns with Tokio

### Async Functions
```rust
#[async_trait]
pub trait PaymentProvider: Send + Sync {
    async fn charge(&self, request: ChargeRequest) -> Result<ChargeResponse, ProviderError>;
    async fn refund(&self, request: RefundRequest) -> Result<RefundResponse, ProviderError>;
}
```

### Shared State with Arc<RwLock>
```rust
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub config: Arc<Config>,
    pub cache: Arc<RwLock<HashMap<String, Vec<Payment>>>>,
}

// Initialize
let cache: Arc<RwLock<HashMap<String, Vec<Payment>>>> = 
    Arc::new(RwLock::new(HashMap::new()));

// Use in handler
async fn get_cached_payments(
    State(state): State<Arc<RwLock<HashMap<String, Vec<Payment>>>>>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Payment>>, StatusCode> {
    let cache = state.read().await;
    let payments = cache.get(&user_id).cloned().unwrap_or_default();
    Ok(Json(payments))
}
```

---

## Testing

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::payment::PaymentStatus;

    #[test]
    fn test_payment_creation() {
        let payment = Payment::new(
            "order-123".to_string(),
            100.50,
            "USD".to_string(),
        );
        
        assert_eq!(payment.status(), PaymentStatus::Pending);
        assert_eq!(payment.amount(), 100.50);
    }

    #[test]
    fn test_payment_status_transition() {
        let mut payment = Payment::new("order-123".to_string(), 100.0, "USD".to_string());
        
        payment.mark_as_completed();
        assert_eq!(payment.status(), PaymentStatus::Completed);
        
        // Cannot go from Completed to Pending
        assert!(payment.mark_as_pending().is_err());
    }
}
```

### Mock Implementation for Tests
```rust
#[derive(Clone)]
pub struct MockPaymentRepository {
    payments: Arc<RwLock<Vec<Payment>>>,
}

impl MockPaymentRepository {
    pub fn new() -> Self {
        Self {
            payments: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

#[async_trait]
impl PaymentRepository for MockPaymentRepository {
    async fn find_by_id(&self, id: i64) -> Result<Option<Payment>, DbError> {
        let payments = self.payments.read().await;
        Ok(payments.iter().find(|p| p.id() == id).cloned())
    }
}
```

### Run Tests
```bash
cargo test                             # All tests
cargo test --lib                      # Library tests only
cargo test payment_entity_test        # Specific test file
cargo test -- --nocapture             # Show output
```

---

## Error Handling

### Domain Errors with HTTP Status Mapping
```rust
#[derive(Debug, thiserror::Error)]
pub enum PaymentError {
    #[error("payment not found: {0}")]
    #[status(404)]
    NotFound(i64),
    
    #[error("invalid amount: {0}")]
    #[status(400)]
    InvalidAmount(f64),
    
    #[error("payment failed: {0}")]
    #[status(502)]
    ProviderError(String),
}

impl PaymentError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            PaymentError::NotFound(_) => StatusCode::NOT_FOUND,
            PaymentError::InvalidAmount(_) => StatusCode::BAD_REQUEST,
            PaymentError::ProviderError(_) => StatusCode::BAD_GATEWAY,
        }
    }
}
```

### Handler Error Mapping
```rust
async fn create_payment(
    // ...
) -> Result<Json<PaymentResponse>, StatusCode> {
    command.execute(request)
        .await
        .map(|p| Json(PaymentResponse::from(p)))
        .map_err(|e| e.status_code())
}
```

---

## Database

- **ORM**: SeaORM
- **Migrations**: SeaSchema (SQLx-based)
- **Connection**: `DatabaseConnection` from `sea_orm`
- **Env**: Use `.env` files (never commit secrets)

### Migration Example
```rust
// infrastructure/database/migrations/001_create_payments.rs
use sea_schema::migration::{MigrationTrait, MigrationName};

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "create_payments_table"
    }
}

impl MigrationTrait for Migration {
    async fn up(&self, resolver: &sea_schema::migration::SchemaResolver) -> Result<(), Box<dyn std::error::Error>> {
        resolver
            .create_table("payments", |t| {
                t.primary_key_column("id").auto_increment().integer();
                t.column("order_id").string().not_null();
                t.column("amount").decimal().not_null();
                t.column("currency").string().not_null();
                t.column("status").string().not_null();
                t.column("created_at").timestamp().not_null();
                t.column("updated_at").timestamp();
            })
            .await?;
        Ok(())
    }
}
```

---

## Git Conventions

```
feat(payments): add payment processing endpoint
fix(payments): resolve invoice generation bug
refactor(payments): extract payment provider interface
test(payments): add unit tests for coupon validation
```

---

## Best Practices

1. **Never commit secrets** - Use `.env` files
2. **Run linter before committing** - `cargo clippy`
3. **Use explicit types** in public APIs
4. **Keep handlers thin** - Delegate to application layer
5. **Write tests for new features** - Unit tests for domain logic
6. **Document complex logic** - Use Rustdoc comments
7. **Follow existing patterns** - Check `payments-service/AGENTS.md`
8. **Use `#[async_trait]`** for async trait methods
9. **Handle errors at every layer** - Don't ignore errors
10. **Use Arc/RwLock** for shared state in async contexts

---

## Skills System

El payments-service tiene acceso a skills globales y skills específicos del proyecto.

### Skills Globales (desde `~/.opencode/skills/`)

```bash
golang-patterns         # Patrones Go útiles como referencia
golang-gin-api          # API patterns con Gin
golang-testing          # Testing patterns
typescript             # TypeScript strict patterns
zod-4                  # Zod schema validation
playwright            # E2E testing
pytest                # Python testing (si aplica)
react-19              # React 19 patterns
nextjs-15              # Next.js 15 App Router
tailwind-4             # Tailwind CSS 4
angular-*/            # Angular patterns
django-drf            # Django REST Framework
java-21               # Java 21 patterns
spring-boot-3         # Spring Boot 3
skill-creator         # Para crear nuevas skills
sdd-*                 # SDD workflow completo
```

### Skills del Proyecto (desde `.agents/skills/`)

El proyecto tiene skills específicos para Rust:

```
.agents/skills/
├── rust-best-practices/           # Convenciones y patterns de Rust
├── rust-system-event-driven/     # Eventos y concurrencia en Rust
├── rust-errors/                 # Manejo de errores en Rust
├── rust-backend/                 # Patterns para backends Rust
├── rust-expert-best-practices-code-review/  # Code review rules
├── rust-skills/                 # Rust skills básicos
├── rust-pro/                    # Rust profesional
├── rust-desktop-applications/   # Desktop apps con Rust
└── kubernetes-*/               # Kubernetes patterns
```

### Cuándo Usar Cada Skill

| Cuando estés... | Usa esta skill |
|-----------------|----------------|
| Escribiendo código Rust | `rust-best-practices` |
| Manejando errores | `rust-errors` |
| Trabajando con eventos/concurrencia | `rust-system-event-driven` |
| Haciendo code review | `rust-expert-best-practices-code-review` |
| Construyendo APIs con Axum | `golang-gin-api` (referencia) |
| Testing | `golang-testing` (referencia) |
| Planning de features grandes | `sdd-*` workflow |

### SDD Workflow

Para cambios sustanciales en el payments-service, usá el workflow SDD:

```bash
/sdd-init              # Inicializar estructura
/sdd-explore <topic>   # Investigar antes de comprometer
/sdd-new <change>      # Crear nuevo cambio
/sdd-propose          # Crear propuesta
/sdd-spec              # Escribir especificaciones
/sdd-design           # Diseño técnico
/sdd-tasks            # Dividir en tareas
/sdd-apply            # Implementar tareas
/sdd-verify           # Verificar implementación
/sdd-archive          # Archivar cambio completado
```

### Ejemplo: Cómo Usar una Skill

Cuando necesitás help con manejo de errores en Rust:

1. El sistema detecta automáticamente el contexto de Rust
2. O podés invocar manualmente: la skill se carga automáticamente

Las skills proporcionan:
- Patrones recomendados para el código
- Convenciones de nomenclatura
- Ejemplos de código
- Reglas de code review

### Actualizar Registry

Si agregás nuevos skills al proyecto:

```bash
# El sistema detecta automáticamente los nuevos skills
# en .agents/skills/ y los hace disponibles
```

El archivo `skills-lock.json` en la raíz del proyecto mantiene el registro de skills disponibles.
