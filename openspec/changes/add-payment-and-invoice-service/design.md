# Design: Payment & Invoice Microservice

## Technical Approach

El microservicio de pagos será el **primer servicio en Rust** del ecosistema Petpay. Se utilizará:

- **Axum** como framework web (async, basado en Tokio)
- **SeaORM** como ORM (similar a GORM pero para Rust, integra bien con async)
- **Tokio** para concurrencia
- **Tower** para middlewares
- **PDF generation** con `printpdf` o `pdf-writer`

La arquitectura sigue el patrón hexagonal adaptado a Rust, con separación clara entre domain, ports, application e infrastructure.

## Architecture Decisions

### Decision: Rust + Axum como framework

**Choice**: Rust con Axum para el microservicio de pagos

**Alternatives considered**:
- Go + Gin (ya usado en marketplace, catalog, bookings)
- Node.js + Express (ya usado en Identity)

**Rationale**:
- El usuario específicamente pidió Rust + Axum
- Rust ofrece performance y seguridad de memoria
- Axum es el estándar de facto para Rust async web services
- Tokio proporciona concurrencia liviana con green threads

### Decision: SeaORM como ORM

**Choice**: SeaORM para acceso a base de datos

**Alternatives considered**:
- SQLx (más bajo nivel, más complejo)
- Diesel (sync only, no async)
- raw SQL con `tokio-postgres`

**Rationale**:
- SeaORM soporta async nativamente
- Integración excelente con Tokio
- Migration system incorporado
--like API similar a GORM (equipo ya conoce el patrón)
- Soporta múltiples databases (PostgreSQL, MySQL)

### Decision: Arquitectura hexagonal adaptada a Rust

**Choice**: Estructura de carpetas basada en el patrón Ports & Adapters

```
payments-service/
├── src/
│   ├── domain/           # Entidades y lógica de dominio
│   │   ├── entities/     # Structs del dominio
│   │   └── mod.rs
│   │
│   ├── ports/            # Interfaces (traits en Rust)
│   │   ├── repository/   # Traits para repositorios
│   │   ├── services/     # Traits para servicios externos
│   │   └── mod.rs
│   │
│   ├── application/      # Casos de uso (handlers de Axum)
│   │   ├── commands/     # Write operations
│   │   ├── queries/      # Read operations
│   │   └── mod.rs
│   │
│   ├── infrastructure/   # Implementaciones concretas
│   │   ├── database/     # SeaORM models y repositories
│   │   ├── http/         # Axum handlers y routes
│   │   ├── pdf/          # Generador de PDFs
│   │   ├── email/        # Cliente HTTP para Identity
│   │   ├── payment/      # Adaptadores de pago (Stripe, PayPal)
│   │   └── mod.rs
│   │
│   ├── lib.rs
│   └── main.rs           # Entry point
│
├── Cargo.toml
└── Dockerfile
```

**Alternatives considered**:
- Estructura "onion architecture"
- Clean Architecture con capas

**Rationale**:
- Equivale a la estructura hexagonal que ya usan los servicios Go
- Patrón conocido por el equipo
- Separa preocupaciones claramente

### Decision: Integración con Identity para emails

**Choice**: Payment service llama a Identity via HTTP REST

**Alternatives considered**:
- Shared library NPM en Rust (no práctico)
- RabbitMQ events para email async

**Rationale**:
- Simplicidad: endpoint HTTP existente
- El usuario pidió agregar endpoint `POST /api/v1/emails/send` en Identity
- Desacoplamiento entre servicios

### Decision: PDF generation con `printpdf`

**Choice**: `printpdf` crate para generar PDFs

**Alternatives considered**:
- `pdf-writer` (más bajo nivel)
- HTML a PDF con `weasyprint` (requiere binary externo)

**Rationale**:
- API simple y directa
- No requiere dependencias externas
- Soporta imágenes y texto

## Data Flow

### Flow: Process Payment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                          │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/v1/payments                                              │   │
│  │  - Extract JWT token                                                │   │
│  │  - Validate request body                                            │   │
│  │  - Extract user_id from token                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ProcessPaymentCommand                                              │   │
│  │  1. Validate order exists & belongs to user                        │   │
│  │  2. Check order not already paid                                    │   │
│  │  3. Create payment record (PENDING)                                │   │
│  │  4. Call payment provider (Stripe/PayPal)                         │   │
│  │  5. On success: update payment status to COMPLETED                 │   │
│  │  6. Generate invoice                                               │   │
│  │  7. Generate PDF                                                   │   │
│  │  8. Send email via Identity service                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  REPOSITORY     │   │  PAYMENT        │   │  EMAIL          │
│  (SeaORM)       │   │  PROVIDER       │   │  (HTTP Client) │
│                 │   │  (Stripe/PP)    │   │                 │
│  - Payment      │   │                 │   │  POST /emails   │
│  - Invoice      │   │  - Create pay   │   │  - Send invoice │
│  - Coupon       │   │  - Verify       │   │    with PDF     │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Flow: Validate Order (via Marketplace service)

```
Payment Service ──HTTP──> Marketplace Service
                           │
                           ▼
                    GET /api/v1/orders/{order_id}
                    (with JWT auth)
                           │
                           ▼
                    Return order if:
                    - exists
                    - belongs to user
                    - not already paid
```

## File Changes

### New Files to Create

| File | Description |
|------|-------------|
| `payments-service/Cargo.toml` | Dependencias del proyecto |
| `payments-service/Dockerfile` | Container Docker |
| `payments-service/src/main.rs` | Entry point |
| `payments-service/src/lib.rs` | Library root |
| `payments-service/src/domain/mod.rs` | Domain module |
| `payments-service/src/domain/entities/payment.rs` | Payment entity |
| `payments-service/src/domain/entities/invoice.rs` | Invoice entity |
| `payments-service/src/domain/entities/coupon.rs` | Coupon entities |
| `payments-service/src/ports/mod.rs` | Ports module |
| `payments-service/src/ports/repository/mod.rs` | Repository traits |
| `payments-service/src/ports/services/mod.rs` | Service traits |
| `payments-service/src/application/mod.rs` | Application module |
| `payments-service/src/application/commands/mod.rs` | Command handlers |
| `payments-service/src/application/queries/mod.rs` | Query handlers |
| `payments-service/src/infrastructure/mod.rs` | Infrastructure module |
| `payments-service/src/infrastructure/database/mod.rs` | SeaORM setup |
| `payments-service/src/infrastructure/http/mod.rs` | Axum routes |
| `payments-service/src/infrastructure/http/handlers/mod.rs` | HTTP handlers |
| `payments-service/src/infrastructure/pdf/mod.rs` | PDF generator |
| `payments-service/src/infrastructure/email/mod.rs` | Identity email client |
| `payments-service/src/infrastructure/payment/mod.rs` | Payment providers |

### Files to Modify

| File | Description |
|------|-------------|
| `docker-compose.yml` | Agregar payments service |
| `krakend/krakend.json` | Agregar rutas de payments |
| `Identity/src/infrastructure/http/routes/` | Agregar email endpoint |
| `Identity/src/application/ports/IEmailService.ts` | Añadir método sendInvoice |

## Interfaces / Contracts

### Payment Request DTO

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct CreatePaymentRequest {
    pub order_id: String,
    pub payment_method: PaymentMethod,
    pub provider_token: Option<String>,  // Stripe/PayPal token
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum PaymentMethod {
    Stripe,
    PayPal,
    CreditCard,
}
```

### Payment Response DTO

```rust
#[derive(Debug, Serialize)]
pub struct PaymentResponse {
    pub id: String,
    pub order_id: String,
    pub customer_id: String,
    pub amount: Decimal,
    pub currency: String,
    pub method: PaymentMethod,
    pub status: PaymentStatus,
    pub provider_payment_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Repository Ports (Traits)

```rust
// ports/repository/payment_repository.rs
pub trait PaymentRepository: Send + Sync {
    async fn create(&self, payment: &Payment) -> Result<Payment, RepoError>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Payment>, RepoError>;
    async fn find_by_order_id(&self, order_id: &str) -> Result<Option<Payment>, RepoError>;
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Payment>, RepoError>;
    async fn update(&self, payment: &Payment) -> Result<Payment, RepoError>;
}

// ports/repository/invoice_repository.rs
pub trait InvoiceRepository: Send + Sync {
    async fn create(&self, invoice: &Invoice) -> Result<Invoice, RepoError>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Invoice>, RepoError>;
    async fn find_by_payment_id(&self, payment_id: &str) -> Result<Option<Invoice>, RepoError>;
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Invoice>, RepoError>;
}

// ports/repository/coupon_repository.rs
pub trait CouponRepository: Send + Sync {
    async fn find_by_code(&self, code: &str) -> Result<Option<Coupon>, RepoError>;
    async fn increment_uses(&self, id: i64) -> Result<(), RepoError>;
}
```

### Service Ports (Traits)

```rust
// ports/services/payment_provider.rs
pub trait PaymentProvider: Send + Sync {
    async fn create_payment(
        &self,
        amount: Decimal,
        currency: &str,
        token: &str,
    ) -> Result<PaymentResult, PaymentError>;
    
    async fn verify_payment(
        &self,
        provider_payment_id: &str,
    ) -> Result<PaymentStatus, PaymentError>;
}

// ports/services/email_sender.rs
pub trait EmailSender: Send + Sync {
    async fn send_invoice(
        &self,
        to: &str,
        full_name: &str,
        invoice_pdf: &[u8],
        invoice_number: &str,
    ) -> Result<(), EmailError>;
}
```

### Domain Entities

```rust
// domain/entities/payment.rs
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use uuid::Uuid;

pub struct Payment {
    pub id: Uuid,
    pub order_id: String,
    pub customer_id: String,
    pub amount: Decimal,
    pub currency: String,
    pub method: PaymentMethod,
    pub status: PaymentStatus,
    pub provider_payment_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
    Refunded,
}

pub enum PaymentMethod {
    Stripe,
    PayPal,
    CreditCard,
}

// domain/entities/invoice.rs
pub struct Invoice {
    pub id: Uuid,
    pub invoice_number: String,
    pub payment_id: Uuid,
    pub customer_id: String,
    pub customer_name: String,
    pub customer_email: String,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub discount: Decimal,
    pub total: Decimal,
    pub status: InvoiceStatus,
    pub pdf_path: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub enum InvoiceStatus {
    Issued,
    Sent,
    Paid,
}

// domain/entities/coupon.rs
pub struct Coupon {
    pub id: i64,
    pub code: String,
    pub discount_type: DiscountType,
    pub discount_value: Decimal,
    pub min_order_amount: Option<Decimal>,
    pub valid_from: DateTime<Utc>,
    pub valid_until: DateTime<Utc>,
    pub max_uses: Option<i32>,
    pub current_uses: i32,
}

pub enum DiscountType {
    Percentage,
    Fixed,
}
```

## API Endpoints

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /api/v1/payments | CreatePayment | Process new payment |
| GET | /api/v1/payments/:id | GetPayment | Get payment by ID |
| GET | /api/v1/payments | ListPayments | List user's payments |
| GET | /api/v1/invoices/:id | GetInvoice | Get invoice by ID |
| GET | /api/v1/invoices | ListInvoices | List user's invoices |
| GET | /api/v1/invoices/:id/pdf | DownloadInvoice | Download invoice PDF |
| POST | /api/v1/coupons/validate | ValidateCoupon | Validate coupon code |
| POST | /api/v1/coupons/apply | ApplyCoupon | Apply coupon to order |

### Request/Response Examples

#### POST /api/v1/payments

Request:
```json
{
  "order_id": "ord_123abc",
  "payment_method": "STRIPE",
  "provider_token": "tok_visa123"
}
```

Response (201):
```json
{
  "id": "pay_xyz789",
  "order_id": "ord_123abc",
  "customer_id": "cust_456",
  "amount": 99.99,
  "currency": "USD",
  "method": "STRIPE",
  "status": "COMPLETED",
  "provider_payment_id": "pi_abc123",
  "created_at": "2026-03-11T10:00:00Z",
  "updated_at": "2026-03-11T10:00:05Z"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Domain entities, value objects, business rules | Test structs con casos edge |
| Unit | Repository traits (con mocks) | Mock implementations |
| Unit | Payment provider logic | Mock Stripe/PayPal responses |
| Integration | HTTP endpoints | Subtests con test client |
| Integration | Database operations | Test container con PostgreSQL |
| Integration | PDF generation | Verify PDF structure |
| Integration | Email client | Mock HTTP responses |

### Testing Dependencies

```toml
[dev-dependencies]
axum = { version = "0.7", features = ["test"] }
tower = { version = "0.4", features = ["util"] }
mockall = "0.12"
tokio-test = "0.4"
```

## Migration / Rollout

### Phase 1: Infrastructure
1. Create payments-service directory
2. Add Cargo.toml with dependencies
3. Set up SeaORM models and migrations
4. Create database tables

### Phase 2: Core Domain
1. Implement domain entities
2. Implement repository traits
3. Implement service traits

### Phase 3: Application
1. Implement command handlers
2. Implement query handlers

### Phase 4: Infrastructure
1. Implement SeaORM repositories
2. Implement payment provider adapters
3. Implement PDF generator
4. Implement Identity email client

### Phase 5: HTTP Layer
1. Set up Axum router
2. Implement handlers
3. Add authentication middleware
4. Add validation

### Phase 6: Integration
1. Add payments service to docker-compose
2. Add routes to KrakenD
3. Add email endpoint to Identity
4. Run integration tests

### Rollback Plan

1. Remove payments service from docker-compose.yml
2. Remove payments routes from krakend.json
3. Remove email endpoint from Identity
4. Drop payments-related tables from PostgreSQL

## Open Questions

- [ ] **PDF Storage**: Should PDFs be stored locally or in cloud storage (S3)?
  - Recommendation: Local initially, S3 later
  
- [ ] **Payment Idempotency**: How to handle duplicate payment requests?
  - Recommendation: Check for existing payment with same order_id before creating

- [ ] **Order Validation**: Should payment service call marketplace directly or use events?
  - Recommendation: HTTP call initially for simplicity, events later

- [ ] **Currency Support**: Only USD initially or multi-currency?
  - Recommendation: USD initially per MVP

---

## Next Step

Ready for tasks (sdd-tasks) to break down implementation.
