# Exploration: payments-service-rust-best-practices

## Current State

### N+1 Queries (payment_repository.rs)
El archivo `src/infrastructure/database/repositories/payment_repository.rs` tiene dos funciones con N+1 queries:
- **Líneas 106-120**: `find_by_order_id()` carga TODOS los payments y filtra en memoria
- **Líneas 122-136**: `find_by_customer()` hace lo mismo, carga TODOS los registros

```rust
// PROBLEMA: Carga todos los registros y filtra en memoria
async fn find_by_order_id(&self, order_id: &str) -> Result<Option<Payment>, DomainError> {
    let results = PaymentEntity::find()
        .all(&self.db)  // <-- CARGA TODOS
        .await
        .map_err(|e| DomainError::InternalError(e.to_string()))?;
    
    let filtered: Vec<Payment> = results
        .into_iter()
        .filter(|p| p.order_id == order_id)  // <-- FILTRA EN MEMORIA
        .map(Self::to_domain)
        .collect();
    
    Ok(filtered.into_iter().next())
}
```

### unwrap() en main.rs
El archivo `src/main.rs` tiene múltiples usos de `.unwrap()` y `.expect()` que violan la regla `avoid-panic`:

| Línea | Código | Problema |
|-------|-------|----------|
| 48 | `.unwrap_or_else(\|_\| ...)` | Manejo de EnvFilter |
| 58 | `.expect("Failed to load configuration")` | Config load |
| 65 | `.expect("Failed to connect to database")` | DB connection |
| 72 | `.expect("Failed to run database migrations")` | Migrations |
| 140 | `.expect("Failed to bind to port")` | Server bind |
| 144 | `.expect("Failed to start server")` | Server start |
| 170, 187, 203, 220, 236, 259, 281, 299 | `.unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)` | Error mapping |

### Clippy Config (Cargo.toml)
El archivo `Cargo.toml` NO tiene configuración de clippy. Falta agregar:
- `clippy = { version = "1.0", features = ["pedantic"] }`
- Lints requeridos: `avoid-panic`, `explicit-iter-loop`, etc.

### Handlers Duplicados (main.rs vs handlers/)
Los handlers están implementados en main.rs (líneas 149-302) pero existen archivos placeholder en `src/infrastructure/http/handlers/`:
- `payment.rs` - placeholders retornando `NOT_IMPLEMENTED`
- `invoice.rs` - placeholders retornando `NOT_IMPLEMENTED`
- `coupon.rs` - placeholders retornando `NOT_IMPLEMENTED`

## Affected Areas

| Archivo | Problema | Esfuerzo |
|---------|----------|----------|
| `src/infrastructure/database/repositories/payment_repository.rs` | N+1 queries | Medium |
| `src/main.rs` | unwrap()/expect() | Low |
| `Cargo.toml` | Falta clippy config | Low |
| `src/infrastructure/http/handlers/*.rs` | Implementar handlers | High |

## Approaches

### Approach 1: Fix Individual Issues Separately
- **Pros**: Cambios pequeños y enfocados, menos riesgo
- **Cons**: No hay visión holística, posible inconsistencias
- **Esfuerzo**: Bajo-Medium

### Approach 2: Refactor Completo con Handler Migration
- **Pros**: Arquitectura limpia, handlers thin
- **Cons**: Mayor riesgo, más tiempo
- **Esfuerzo**: High

## Recommendation

**Approach 1** para N+1 y unwrap() - cambios directos y de bajo riesgo.
**Approach 2** para Handlers - requiere más trabajo pero alinea con la arquitectura.

Para este change, recominedo:
1. Fix N+1 con queries específicos de SeaORM
2. Reemplazar unwrap() con ? operator y match
3. Agregar clippy config a Cargo.toml
4. Para handlers: crear la implementación completa en lugar de solo "conectar" (los placeholders actuales retornan NOT_IMPLEMENTED)

## Risks

- **Riesgo bajo**: N+1 fix es straightforward con SeaORM
- **Riesgo bajo**: unwrap() en main es código de initialization, algunos .expect() son aceptables según la regla avoid-panic para "critical initialization failures"
- **Riesgo medio**: Handlers requieren implementar la lógica completa, no solo conectar

## Ready for Proposal

**Yes**. Los problemas están claramente identificados y las soluciones son directas.

Para los handlers: el issue dice "solo conectarlos" pero los handlers en `infrastructure/http/handlers/` son placeholders que retornan `NOT_IMPLEMENTED`. Se requiere implementación real.
