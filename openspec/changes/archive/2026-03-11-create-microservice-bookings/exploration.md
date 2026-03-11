# Exploración: Microservicio de Bookings

## Objetivo
Investigar el codebase para entender cómo crear un nuevo microservicio de "bookings" en Go con RabbitMQ para reservas de servicios para mascotas.

---

## 1. Estructura de Microservicios Existentes

### Marketplace Service (Go/Gin/GORM)
- **Puerto**: 8080
- **Estructura hexagonal**:
  ```
  marketplace/
  ├── cmd/main.go              # Entry point
  └── internal/
      └── application/
          ├── core/            # Entidades de dominio
          │   ├── order.go
          │   ├── orderStatus.go
          │   └── orderItem.go
          ├── ports/           # Interfaces (contratos)
          │   ├── repository/
          │   └── services/
          ├── services/       # Implementaciones
          └── adapters/
      └── infrastructure/
          ├── http/            # Controllers y Routes
          ├── db/              # Conexión PostgreSQL
          └── repository/      # Implementaciones repository
  ```

### Catalog & Offers Service (Go/Gin/GORM)
- **Puerto**: 8081
- **Igual estructura hexagonal**, diferencia en naming de ports:
  - `ports/In/` - inbound (service interfaces)
  - `ports/Out/` - outbound (repository interfaces)

### Identity Service (TypeScript/Bun/Express/Drizzle)
- **Puerto**: 3000
- **Clean Architecture**:
  - `application/` - Use cases, DTOs, strategies, ports
  - `domain/` - Entities, errors, events, repository interfaces
  - `infrastructure/` - Adapters, implementations, DI

---

## 2. RabbitMQ - Estado Actual

### Configuración Encontrada

**Identity Service** (`Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts`):
- Librería: `amqplib`
- Exchange: `petpay.domain.events` (topic, durable)
- Patrón: Publicador de eventos de dominio
- Routing keys: Eventos como `user.created`, etc.
- Mensajes persistentes (`persistent: true`)
- Graceful degradation: Si RabbitMQ no está disponible, los eventos no se publican pero no falla

**Variables de entorno**:
```
RABBITMQ_URL=amqp://localhost:5672
```

**docker-compose.yml**:
- RabbitMQ NO está definido como servicio en docker-compose (solo referenced)
- Servicios conectados a `petpay-network`

### Patrón de Comunicación Actual
- **Identity → RabbitMQ**: Publica eventos (`user.created`, etc.)
- **Marketplace/Catalog**: No consumen eventos de RabbitMQ actualmente
- No hay consumidores activos en el sistema

---

## 3. Email Service - Contrato

### Interfaz IEmailService (`Identity/src/application/ports/IEmailService.ts`)

```typescript
export interface IEmailService {
  send: (
    template: string,
    to: string,
    subject: string,
    locals?: Record<string, any>
  ) => Promise<{success: boolean, messageId?: string, error?: any}>

  sendVerificationEmail: (
    to: string,
    firstName: string,
    userId: string
  ) => Promise<{success: boolean, messageId?: string, error?: any}>
}
```

### Implementación: NodemailerService
- Usa `nodemailer` + `email-templates`
- Soporta plantillas EJS
- Templates en `templates/verificationEmail/`
- Configuración via env: `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`

---

## 4. Dominio de Bookings - Análisis

### Propuesta Original del Usuario

| Entidad | Propósito |
|---------|-----------|
| Booking | Entidad principal de reserva |
| BookingStatus | Estados de la reserva |
| TransportDetails | Detalles específicos de transporte |
| SittingDetails | Detalles de guardería/estancia |
| GroomingDetails | Detalles de grooming |
| VetAppointmentDetails | Detalles de cita veterinaria |
| LocationTracking | Tracking de ubicación |

### Análisis Crítico

**PROBLEMA**: La propuesta tiene muchas entidades separadas que podrían resolverse de forma más simple.

**Análisis de servicios existentes**:
- `catalog-&-offers` ya tiene `ServiceOffering` y `ServiceType` que definen tipos de servicios
- Los servicios propuestos (TRANSPORT, SITTING, GROOMING, VET_APPOINTMENT) ya existen conceptualmente

**Simplificación sugerida**:

```
Booking (entidad principal)
├── id, customerId, providerId
├── serviceType (enum: TRANSPORT, SITTING, GROOMING, VET_APPOINTMENT)
├── status (enum)
├── scheduledDate, startTime, endTime
├── location (origen/destino)
├── petId
├── price
├── notes
├── ServiceSpecificDetails (JSONB - flexible)
└── LocationTracking (JSONB - opcional)
```

**Beneficios**:
- 1 sola tabla en vez de 6+
- JSONB para detalles específicos por tipo de servicio
- Flexible para agregar nuevos tipos de servicio
- Sigue el patrón de `Order` en marketplace (campos específicos en la entidad principal)

---

## 5. Comunicación entre Servicios

### Estado Actual
- **nginx** como reverse proxy en docker-compose
- Servicios acceden directamente a otros servicios via hostname interno
- No hay API Gateway unificado

### Para Bookings
- Puerto sugeridos: `8082`
- Endpoints REST estándar
- RabbitMQ para eventos asincrónicos (futuro)
- Posible comunicación directa a marketplace/catalog para validar servicios

---

## Current State

El sistema Petpay tiene:
1. **3 microservicios**: Identity (TS, :3000), Marketplace (Go, :8080), Catalog (Go, :8081)
2. **Arquitectura hexagonal** en Go services
3. **RabbitMQ configurado** en Identity pero sin consumidores activos
4. **Email service** con interfaz IEmailService implementado con Nodemailer
5. **Patrones de dominio** en marketplace (Order con OrderStatus, OrderItem)

---

## Affected Areas

- `marketplace/` - Referencia para estructura hexagonal Go
- `catalog-&-offers/` - Referencia para estructura hexagonal Go
- `Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts` - Referencia RabbitMQ
- `Identity/src/infrastructure/services/NodemailerService.ts` - Referencia email
- `docker-compose.yml` - Necesitaría agregar RabbitMQ y bookings service
- `k8s/base/secrets.yaml` - Configuración de secrets

---

## Approaches

### 1. Full Entities Approach (como propuso usuario)

**Entidades**:
- Booking, BookingStatus, TransportDetails, SittingDetails, GroomingDetails, VetAppointmentDetails, LocationTracking

**Pros**:
- Modelo de datos riguroso
- Tablas separadas para cada tipo de servicio
- Relaciones claras

**Contras**:
- Complejo de mantener (6+ tablas)
- JOINs complejos para queries comunes
- Difícil agregar nuevos tipos de servicio
- Desperdicio de recursos (tablas sparse)

**Esfuerzo**: Alto (crear 7+ entidades, migrations, repositorios separados)

---

### 2. Simplified Approach (recomendado)

**Entidades**:
- Booking (con campo `serviceType` enum y `details` JSONB)
- BookingStatus (enum)

```
Booking {
  id, customerId, providerId
  serviceType: TRANSPORT | SITTING | GROOMING | VET_APPOINTMENT
  status: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
  scheduledDate, startTime, endTime
  originLocation, destinationLocation
  petId
  price, currency
  details: JSONB (detalles específicos por serviceType)
  tracking: JSONB (ubicación)
  notes
  createdAt, updatedAt
}
```

**Pros**:
- Simple de implementar (2 entidades)
- Flexible para nuevos tipos de servicio
- Queries simples (sin JOINs)
- JSONB permite evolución del schema
- Sigue patrón de marketplace (Order con OrderStatus)

**Contras**:
- Menos validación a nivel de DB
- JSONB menos performante que columns dedicadas (pero aceptable)

**Esfuerzo**: Bajo-Medio

---

### 3. Event-Sourced Approach

**Concepto**: Booking es una serie de eventos, no un estado

```
BookingCreated → BookingConfirmed → BookingStarted → BookingCompleted
                                     → BookingCancelled
```

**Pros**:
- Full history / audit trail
- Reconstrucción de estado en cualquier punto
- Eventos publishables a otros servicios

**Contras**:
- Overkill para MVP
- Complejidad adicional en querying
- CQRS necesario para lectura eficiente

**Esfuerzo**: Alto

---

## Recommendation

**Recomiendo el Approach #2 (Simplificado)** por las siguientes razones:

1. **Sigue patrones existentes**: Marketplace usa Order con OrderStatus (enum), Booking puede usar el mismo patrón
2. **Tiempo de mercado**: MVP rápido con flexibilidad para evolucionar
3. **JSONB**: PostgreSQL maneja JSONB eficientemente y permite almacenar detalles específicos sin crear tablas adicionales
4. **Escalabilidad**: Agregar nuevos tipos de servicio = solo agregar valor al enum y al handler
5. **Complejidad justificada**: No hay justificación para 7+ tablas en un sistema de reservas simple

**Arquitectura sugerida**:

```
bookings/
├── cmd/main.go
└── internal/
    └── application/
        ├── core/
        │   ├── booking.go
        │   └── bookingStatus.go
        ├── ports/
        │   ├── In/booking_service_port.go
        │   └── Out/booking_repository_port.go
        ├── adapters/
        │   └── booking_adapter.go
        └── services/
            └── booking_service.go
    └── infrastructure/
        ├── http/
        │   ├── controller.go
        │   └── routes.go
        ├── db/
        │   └── postgres.go
        └── repository/
            └── postgres_booking_repository.go
```

**Puerto del servicio**: 8082

**RabbitMQ**: Agregar consumidor para eventos como `user.created` (si bookings necesita crear reservas automáticamente) o publicar eventos de `booking.created`, `booking.completed`, etc.

---

## Risks

1. **No hay consumidores RabbitMQ activos** - Si bookings necesita reaccionar a eventos de otros servicios, hay que implementarlo
2. **Sin API Gateway** - Servicios acceden directamente entre sí; considerar nginx routes
3. **Database compartida vs dedicada** - Por ahora todos comparten PostgreSQL en docker-compose; para producción considerar bases separadas
4. **Autenticación entre servicios** - Marketplace/Catalog no tienen auth middleware; si bookings necesita validar tokens de Identity, usar JWT validation
5. **JSONB performance** - Para queries complejas sobre details, considerar indexación específica

---

## Ready for Proposal

**SÍ** - La exploración está completa y el camino está claro. 

El Approach #2 es el más práctico para un MVP y se alinea con los patrones existentes en el codebase.

### Siguiente paso sugerido:
`/sdd-propose create-microservice-bookings` para crear el proposal formal con:
- Especificación de entidades
- Endpoints HTTP
- Integración RabbitMQ
- Flujo de desarrollo
