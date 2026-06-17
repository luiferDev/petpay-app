# Exploración: Microservicio de Pagos y Facturación en Rust

## Estado Actual del Sistema

### Arquitectura de Microservicios

El proyecto Petpay actualmente tiene los siguientes servicios:

| Servicio | Tecnología | Puerto | Base de Datos |
|----------|------------|--------|---------------|
| Identity | TypeScript/Bun | 3000 | PostgreSQL (Drizzle) |
| Marketplace | Go/Gin | 8080 | PostgreSQL (GORM) |
| Catalog | Go/Gin | 8081 | PostgreSQL (GORM) |
| Bookings | Go/Gin | 8082 | PostgreSQL (GORM) |
| API Gateway | KrakenD | 8080 | - |

**No existe ningún servicio en Rust actualmente** - este sería el primero.

### Servicios Existentes (Go) - Patrones a Seguir

#### Marketplace - Estructura Hexagonal

```
marketplace/
├── cmd/main.go
└── internal/application/
    ├── core/                    # Entidades de dominio
    │   ├── order.go
    │   ├── orderItem.go
    │   └── orderStatus.go
    ├── ports/
    │   ├── repository/          # Interfaces de repositorio
    │   └── services/            # Interfaces de servicio
    ├── services/                # Implementaciones de servicio
    └── adapters/
└── infrastructure/
    ├── http/                    # Controladores y rutas (Gin)
    ├── db/                      # Conexión PostgreSQL
    └── repository/              # Implementaciones GORM
```

#### Order Entity (Marketplace)

```go
type Order struct {
    gorm.Model
    OrderNumber      uint64      // Número de orden único
    CustomerId       string      // ID del cliente (viene de Identity)
    StoreProfileId   string      // ID del perfil de tienda
    Status           OrderStatus // PENDING, CONFIRMED, PROCESSING, SHIPPED, etc.
    Subtotal         float64
    ShippingCost     float64
    Tax              float64
    Discount         float64
    TotalAmount      float64
    Currency         float64
    ShippingAddressId string
    BillingAddressId string
    Items            []OrderItem  // Relación uno a muchos
}

type OrderItem struct {
    OrderId       string  // Foreign key
    ProductId     string
    Quantity      int
    UnitPrice     string
    TotalPrice    string
    Currency      string
    ProductName   string
    ProductSKU    string
    ProductImage  string
}
```

### Identity Service - Email

El servicio de Identity tiene un servicio de email implementado:

- **Puerto**: 3000
- **Tecnología**: Nodemailer + Email Templates (EJS)
- **Ubicación**: `Identity/src/infrastructure/services/NodemailerService.ts`
- **Interfaz**: `Identity/src/application/ports/IEmailService.ts`

```typescript
interface IEmailService {
  send(template: string, to: string, subject: string, locals?: Record<string, any>): Promise<...>
  sendVerificationEmail(to: string, firstName: string, userId: string): Promise<...>
}
```

**NO existe un endpoint HTTP público** para enviar emails desde otros servicios. El email solo se usa internamente para verificación de usuarios.

#### Plantillas de Email

```
Identity/templates/
├── verificationEmail/
│   ├── html.ejs
│   └── text.ejs
```

### API Gateway - KrakenD

El API Gateway está configurado en `krakend/krakend.json`:

- Autenticación JWT con RS256
- Valida tokens contra Identity (`http://identity:3000/.well-known/jwks.json`)
- Expone endpoints de cada servicio
- Roles definidos: `user`, `admin`, `service_provider`

### Comunicación Entre Servicios

1. **REST directo**: Los servicios se comunican via HTTP a través del gateway
2. **RabbitMQ**: Para eventos asíncronos (usado en Bookings)
3. **API Key**: Para autenticación service-to-service

---

## Áreas Afectadas

### Archivos a modificar

| Archivo | Por qué |
|---------|---------|
| `docker-compose.yml` | Agregar nuevo servicio de payments |
| `krakend/krakend.json` | Agregar rutas del nuevo servicio |
| `Identity/src/infrastructure/services/NodemailerService.ts` | Potencialmente agregar endpoint para emails |
| `marketplace/internal/application/core/order.go` | Agregar relación con Payments |

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `payments-service/` | Nuevo microservicio en Rust |

---

## Enfoques Propuestos

### 1. Full Entities Approach (Como propone el usuario)

Crear todas las entidades propuestas:

```rust
// Entidades propuestas
struct Invoice { id, order_id, customer_id, status, total, created_at, ... }
struct InvoiceStatus { DRAFT, ISSUED, PAID, CANCELLED, REFUNDED }
struct InvoiceItem { id, invoice_id, description, quantity, unit_price, total }
struct Payment { id, order_id, invoice_id, method, status, amount, ... }
struct PaymentStatus { PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED }
struct PaymentMethod { CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, WALLET }
struct DiscountCoupon { code, discount_type, value, valid_from, valid_until, ... }
struct AppliedCoupon { id, order_id, coupon_code, discount_amount }
struct PlatformFee { order_id, amount, percentage, calculated_at }
```

**Pros:**
- Completo y cubre todos los casos de uso
- Modelo de datos rico y flexible
- Fácil de entender para otros desarrolladores

**Contras:**
- Mucho código boilerplate inicial
- Mayor tiempo de desarrollo para MVP
- Más entidades = más mantenimiento

**Esfuerzo:** Alto (2-3 semanas para MVP funcional)

---

### 2. Simplified Approach (Más simple, menos entidades)

Combinar entidades relacionadas:

```rust
// Entidades simplificadas
struct Payment {
    id, order_id, customer_id,
    status: PaymentStatus,        // PENDING, COMPLETED, FAILED, REFUNDED
    method: PaymentMethod,       // CARD, BANK, WALLET
    amount, currency,
    external_reference,          // ID del procesador de pago
    paid_at,
    invoice_id                   // Nullable - generado después
}

struct Invoice {
    id, order_id, payment_id,
    status: InvoiceStatus,      // DRAFT, ISSUED, PAID, VOIDED
    invoice_number,             // Número secuencial
    issued_at, paid_at,
    items: Vec<InvoiceLine>,    // Líneas de factura
    subtotal, tax, total
}

struct Coupon {
    code, 
    discount_type: Flat|Percentage,
    value,
    max_uses, current_uses,
    valid_until
}
```

**Pros:**
- Más rápido de implementar
- Menos boilerplate
- Suficiente para MVP

**Contras:**
- Menos detallado que el enfoque completo
- Alguna flexibilidad reducida

**Esfuerzo:** Medio (1-2 semanas para MVP)

---

### 3. Event-Sourced Approach (Payments como eventos)

```rust
// Events
struct PaymentInitiated { order_id, amount, method, initiated_at }
struct PaymentCompleted { payment_id, transaction_ref, completed_at }
struct PaymentFailed { payment_id, reason, failed_at }

// State
struct Payment {
    id, order_id,
    status: PaymentStatus,
    amount, method,
    events: Vec<PaymentEvent>  // Event store
}

// Invoice se genera del payment completado
struct Invoice {
    id, order_id, payment_id,
    status: InvoiceStatus,
    // ... invoice data
}
```

**Pros:**
- Completa trazabilidad
- Fácil auditoría
- Reprocesamiento de pagos fallidos
- Scale horizontal

**Contras:**
- Más complejo de implementar
- Overhead para MVP simple
- Curva de aprendizaje del equipo

**Esfuerzo:** Alto (2-3 semanas mínimo)

---

## Recomendación

### Enfoque Recomendado: **#2 Simplified Approach**

**Por qué:**

1. **MVP primero**: El usuario quiere un MVP simple - no necesita todas las entidades upfront
2. **Menor tiempo-to-market**: 1-2 semanas vs 2-3 semanas
3. **Patrón consistente**: Sigue la simplicidad del marketplace actual
4. **Extensible**: Se puede expandir a #1 sin mucho esfuerzo

### Stack Recomendado

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Framework | Axum | Estandar en Rust, basado en Tokio/Tower |
| ORM | SeaORM 2.0 | Async-first, relaciones, migraciones - el más recomendado en 2026 |
| Async Runtime | Tokio | Integrado con Axum, madura y estable |
| PDF Generation | genpdf o krilla | Alto nivel, puro Rust, fácil de usar |
| DB Migration | SeaORM migrations | Integrado con SeaORM |
| Error Handling | thiserror + anyhow | Patrón recomendado en la industria |

### Estructura Propuesta del Servicio

```
payments-service/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── domain/
│   │   ├── mod.rs
│   │   ├── entities/
│   │   │   ├── payment.rs
│   │   │   ├── invoice.rs
│   │   │   └── coupon.rs
│   │   └── events.rs
│   ├── application/
│   │   ├── mod.rs
│   │   ├── ports/
│   │   │   ├── payment_service.rs
│   │   │   └── invoice_service.rs
│   │   └── services/
│   │       ├── payment_service.rs
│   │       └── invoice_service.rs
│   ├── infrastructure/
│   │   ├── mod.rs
│   │   ├── http/
│   │   │   ├── mod.rs
│   │   │   ├── routes.rs
│   │   │   └── handlers.rs
│   │   ├── db/
│   │   │   └── mod.rs
│   │   └── pdf/
│   │       └── generator.rs
│   └── adapters/
│       ├── mod.rs
│       ├── identity_client.rs    // Para obtener datos del usuario
│       └── email_client.rs       // Para enviar facturas
├── migrations/
└── .env.example
```

### Integración con Identity Email

**Opción A (Recomendada):** Crear endpoint en Identity para enviar emails genéricos
- POST `/api/v1/emails/send`
- Body: `{ template, to, subject, locals }`
- Auth: API Key header

**Opción B:** El servicio de payments tiene su propio email client
- Más independiente
- Más código inicial

---

## Riesgos

### 1. **Nueva tecnología en el equipo**
- **Riesgo**: El equipo no tiene experiencia con Rust
- **Mitigación**: Usar patrones claros de arquitectura hexagonal, tests exhaustivos
- **Impacto**: Alto si no se mitiga

### 2. **Integración con servicios existentes**
- **Riesgo**: El marketplace no tiene estructura de pagos
- **Mitigación**: Definir contrato claro de cómo una orden genera un payment
- **Impacto**: Medio

### 3. **Elección de ORM**
- **Riesgo**: SeaORM puede tener limitaciones en queries complejas
- **Mitigación**: Usar raw queries cuando SeaORM no alcance
- **Impacto**: Bajo

### 4. **Generación de PDFs**
- **Riesgo**: Librerías de PDF pueden tener bugs o limitaciones
- **Mitigación**: Usar genpdf (estable y bien mantenido)
- **Impacto**: Bajo

### 5. **Autenticación service-to-service**
- **Riesgo**: Cómo autenticar requests del payment service a Identity
- **Mitigación**: Usar API Key o JWT con scope de service
- **Impacto**: Medio

---

##listo para Propuesta

**Sí** - El contexto está suficientemente explorado para crear una propuesta detallada.

### Próximos Pasos Recomendados

1. Crear SPEC con entidades simplificadas
2. Definir contrato de API REST
3. Diseñar flujo de payment (cómo se integra con orders)
4. Definir integración con Identity email
5. Planificar tareas de implementación

---

## Referencias

- [SeaORM 2.0 - Async ORM](https://www.sea-ql.org/SeaORM/)
- [Axum - Web Framework](https://docs.rs/axum/latest/axum/)
- [genpdf - PDF Generator](https://github.com/dnlmlr/genpdf-rs)
- [Hexagonal Architecture in Rust](https://www.barrage.net/blog/technology/how-to-apply-hexagonal-architecture-to-rust)
- [KrakenD Gateway](https://www.krakend.io/)
