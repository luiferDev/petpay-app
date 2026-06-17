# Design: payments-service-rust-best-practices

## Technical Approach

This change addresses four code quality issues in the payments-service:
1. Fix N+1 queries in repository layer using SeaORM's `.filter()` method
2. Replace unwrap/expect with proper error handling using `?` operator
3. Add clippy configuration to Cargo.toml
4. Implement handlers in infrastructure layer and wire to main.rs

## Architecture Decisions

### Decision: N+1 Query Fix Strategy

**Choice**: Use SeaORM's `.filter()` method to push filtering to the database
**Alternatives considered**: 
- Keep `.all()` + in-memory filter (current approach, inefficient)
- Use raw SQL (too low-level, loses ORM benefits)
**Rationale**: SeaORM's `.filter()` generates proper SQL WHERE clauses, reducing data transfer and memory usage. This is the idiomatic SeaORM approach.

### Decision: Error Handling Strategy

**Choice**: Replace `.unwrap()` and `.expect()` with proper error propagation using `?` operator
**Alternatives considered**:
- Use `.expect()` everywhere (current approach, violates avoid-panic rule)
- Add global panic handler (hides errors, bad UX)
**Rationale**: Per `rust-expert-best-practices-code-review/rules/avoid-panic.md`, functions returning Result should use `?` operator, and only critical initialization failures may use `.expect()` with clear messages.

### Decision: Handler Implementation Strategy

**Choice**: Implement handlers in `infrastructure/http/handlers/` using thin handler pattern
**Alternatives considered**:
- Keep handlers inline in main.rs (current approach, violates hexagonal architecture)
- Move all logic to handlers (violates separation of concerns)
**Rationale**: Thin handlers delegate to application layer (commands/queries), following the project's architecture pattern from AGENTS.md.

## Data Flow

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────┐
│ main.rs Router                      │
│ (routes requests to handlers)       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ infrastructure/http/handlers/       │
│ (thin: extract state, call app)    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ application/                        │
│ (commands & queries)               │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ ports/repository                    │
│ (trait interfaces)                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ infrastructure/database/repositories│
│ (SeaORM implementations)            │
└─────────────────────────────────────┘
    │
    ▼
PostgreSQL (with proper WHERE clauses)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/infrastructure/database/repositories/payment_repository.rs` | Modify | Replace `.all()` + filter with `.filter()` for `find_by_order_id` and `find_by_customer` |
| `src/main.rs` | Modify | Replace `.unwrap()` and `.expect()` with proper error handling; wire to implemented handlers |
| `Cargo.toml` | Modify | Add `[lints.rust]` and `[clippy]` sections |
| `src/infrastructure/http/handlers/payment.rs` | Modify | Implement create_payment, get_payment, list_payments |
| `src/infrastructure/http/handlers/invoice.rs` | Modify | Implement get_invoice, list_invoices, download_invoice_pdf |
| `src/infrastructure/http/handlers/coupon.rs` | Modify | Implement validate_coupon, apply_coupon |

## Interfaces / Contracts

### Repository Interface (unchanged)
```rust
#[async_trait]
impl PaymentRepository for PostgresPaymentRepository {
    async fn find_by_order_id(&self, order_id: &str) -> Result<Option<Payment>, DomainError> {
        // Use SeaORM filter instead of .all() + filter
        let result = PaymentEntity::find()
            .filter(PaymentColumn::OrderId.eq(order_id))
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(result.map(Self::to_domain))
    }
    
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Payment>, DomainError> {
        // Use SeaORM filter instead of .all() + filter
        let results = PaymentEntity::find()
            .filter(PaymentColumn::CustomerId.eq(customer_id))
            .all(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(results.into_iter().map(Self::to_domain).collect())
    }
}
```

### Handler Pattern (example)
```rust
// infrastructure/http/handlers/payment.rs
pub async fn create_payment(
    State(state): State<AppState>,
    Json(payload): Json<CreatePaymentRequest>,
) -> Result<Json<PaymentResponse>, StatusCode> {
    let customer_id = "customer_placeholder".to_string();
    
    let command = application::commands::ProcessPaymentCommand::new(
        state.payment_repo.clone(),
        state.stripe_provider.clone(),
        state.email_client.clone(),
        state.marketplace_validator.clone(),
    );

    command.execute(&payload, &customer_id, &customer_email, &customer_name)
        .await
        .map(Json::from)
        .map_err(|e| StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
}
```

### Clippy Configuration
```toml
[lints.rust]
unsafe_code = "forbid"

[clippy]
pedantic = "allow"
# Enable specific lints
too_many_arguments = "warn"
type_complexity = "warn"
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Repository queries return correct data | Mock DbConn, verify .filter() is called |
| Unit | Error handling propagates correctly | Test error cases |
| Integration | Handlers delegate to application layer | Test HTTP responses |
| Integration | N+1 fix - verify single query | Check SQL logs |

## Migration / Rollout

No migration required. This is a code refactoring with no data or schema changes.

## Open Questions

- [ ] None - all technical decisions are straightforward based on existing code patterns
