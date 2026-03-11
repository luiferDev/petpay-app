# Proposal: Create Bookings Microservice

## Intent

Crear un nuevo microservicio en Go para manejar reservas de servicios para mascotas (transporte, estadía, grooming, veterinario). Este microservicio permitirá a los usuarios reservar servicios y recibir confirmaciones por email.

## Scope

### In Scope
- Nuevo microservicio Go en puerto 8082
- Entidades: Booking con serviceType enum y details JSONB
- Integración con RabbitMQ para publicar eventos de cambio de estado
- Integración con Identity email service para enviar confirmaciones
- Endpoints REST para CRUD de bookings

### Out of Scope
- Payment processing (se integra con marketplace)
- Dashboard/admin para manage bookings
- Mobile push notifications
- Sistema de waitlist/cancellation avanzado

## Approach

Estructura hexagonal igual a marketplace/catalog:
- `cmd/` - entry point
- `internal/application/` - use cases
- `internal/domain/` - entities y business logic
- `internal/infrastructure/` - adapters (DB, RabbitMQ, HTTP clients)
- `internal/ports/` - interfaces

Para emails:
- Publicar evento a RabbitMQ cuando cambia estado del booking
- Opcional: llamada directa REST a Identity email service

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modified | Agregar bookings service y RabbitMQ |
| `marketplace/` | Reference | Estructura a seguir |
| `Identity/src/infrastructure/services/NodemailerService.ts` | Reference | Email service a integrar |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No hay consumidores RabbitMQ activos | Medium | Implementar consumer o usar REST directo |
| Auth entre servicios no implementado | High | Usar API keys o JWT service-to-service |
| Database compartida | Low | Schema隔离 en PostgreSQL |

## Rollback Plan

1. Eliminar servicio de docker-compose.yml
2. Eliminar directorio bookings-service/
3. Eliminar tablas booking de PostgreSQL

## Dependencies

- Go 1.21+
- PostgreSQL (compartida)
- RabbitMQ (compartida o nueva)
- Identity service (para email)

## Success Criteria

- [ ] Microservicio corriendo en puerto 8082
- [ ] Endpoints CRUD funcionando
- [ ] Integración con RabbitMQ publicando eventos
- [ ] Email de confirmación enviado al crear booking
- [ ] Tests unitarios pasando
