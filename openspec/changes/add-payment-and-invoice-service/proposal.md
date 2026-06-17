# Proposal: Payment & Invoice Microservice

## Intent

Crear un nuevo microservicio en Rust para manejar pagos y facturación de la plataforma Petpay. Este servicio permitirá procesar pagos con múltiples métodos (PayPal, Stripe, tarjetas) y generar facturas PDF automáticas enviadas por email.

## Scope

### In Scope
- Nuevo microservicio Rust en puerto 8083
- Entidades: Invoice, Payment, PaymentMethod, DiscountCoupon
- Integración con PayPal, Stripe, y tarjetas de crédito
- Generación de facturas PDF
- Integración con Identity email service para enviar facturas
- Validación de orden existente antes de procesar pago

### Out of Scope
- Reembolsos (primera versión)
- Suscripciones recurrentes
- wallets internos
- Historial completo de transacciones

## Approach

Arquitectura hexagonal en Rust:
- `src/domain/` - Entities y value objects
- `src/ports/` - Interfaces (traits)
- `src/application/` - Use cases
- `src/infrastructure/` - Adapters (DB, HTTP, PDF)

Para emails:
- Agregar endpoint POST /api/v1/emails/send en Identity
- Payment service llama a Identity para enviar facturas

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modified | Agregar payments service |
| `Identity/` | Modified | Agregar endpoint emails |
| `krakend/` | Modified | Agregar rutas de payments |
| `marketplace/` | Reference | Orders existentes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Equipo sin experiencia en Rust | High | Código bien documentado, tests |
| Integración con providers (Stripe/PayPal) | Medium | Usar SDKs oficiales |
| Email service endpoint nuevo | Low | Endpoints simples, bien testeados |

## Rollback Plan

1. Eliminar servicio de docker-compose.yml
2. Eliminar endpoint de Identity
3. Eliminar tablas de payments de PostgreSQL

## Dependencies

- Rust 1.75+
- PostgreSQL (compartida)
- Identity service (para email)
- Stripe API (API key)
- PayPal API (API key)

## Success Criteria

- [ ] Microservicio corriendo en puerto 8083
- [ ] Procesar pagos con Stripe
- [ ] Procesar pagos con PayPal
- [ ] Procesar pagos con tarjeta de crédito
- [ ] Generar factura PDF
- [ ] Enviar factura por email
- [ ] Tests unitarios pasando
