# Design: Bookings Microservice

## Technical Approach

Crear un microservicio Go con arquitectura hexagonal siguiendo los patrones de marketplace/catalog. El servicio expondrá una API REST y publicará eventos a RabbitMQ. La comunicación con Identity email service será via HTTP/REST para enviar confirmaciones de reservas.

## Architecture Decisions

### Decision: Puerto del servicio

**Choice**: 8082
**Alternatives considered**: 8083, 8084
**Rationale**: 8080 (marketplace), 8081 (catalog), 8082 (bookings) - sequential ports para mantener consistencia en el ecosistema

---

### Decision: Arquitectura hexagonal

**Choice**: Estructura con cmd/, internal/application/, internal/domain/, internal/infrastructure/, internal/ports/
**Alternatives considered**: Clean Architecture, layered
**Rationale**: Mantiene consistencia exacta con marketplace y catalog existentes. La estructura es:
- `core/` - Entidades de dominio
- `ports/` - Interfaces (repository, services)
- `services/` - Implementaciones de casos de uso
- `infrastructure/` - Implementaciones concretas (HTTP handlers, GORM repository, RabbitMQ)

---

### Decision: Database ORM

**Choice**: GORM
**Alternatives considered**: sqlx, ent
**Rationale**: Mismo ORM usado en marketplace y catalog. Maneja JSONB nativamente y tiene buen soporte para PostgreSQL.

---

### Decision: RabbitMQ vs HTTP para eventos

**Choice**: RabbitMQ para publish events, HTTP/REST para Identity email
**Alternatives considered**: Solo HTTP, solo RabbitMQ
**Rationale**: 
- RabbitMQ para eventos asíncronos internos (`booking.created`, `booking.status_changed`)
- HTTP directo para email para simplicidad en MVP (evita crear endpoint en Identity)

---

### Decision: JSONB para details

**Choice**: PostgreSQL JSONB para service-specific details
**Alternatives considered**: Tablas separadas para cada tipo de servicio
**Rationale**: Simplifica schema, permite evolución de detalles sin migraciones. Cada tipo de servicio (transport, sitting, grooming, vet) tiene campos diferentes que pueden evolucionar independientemente.

---

## Data Flow

```
┌─────────────┐    POST /api/v1/bookings    ┌──────────────────┐
│   Client    │ ────────────────────────────→│  HTTP Handler    │
└─────────────┘                              └────────┬─────────┘
                                                      │
                                              ┌──────▼──────────┐
                                              │  Use Case       │
                                              │  (application)   │
                                              └────────┬─────────┘
                                                       │
                    ┌────────────┐              ┌──────▼──────────┐
                    │  RabbitMQ  │◄─────────────│  Domain         │
                    │  Publisher │              │  (entities)     │
                    └────────────┘              └────────┬─────────┘
                           │                             │
                           │                    ┌─────────▼──────────┐
                           │                    │  Repository       │
                           │                    │  (infrastructure) │
                           │                    └─────────┬──────────┘
                           │                              │
                    ┌──────▼──────┐                       │
                    │   Identity  │◄───────────────────────┘
                    │   Email     │
                    │   (HTTP)    │
                    └─────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `bookings-service/` | Create | Root directory del microservicio |
| `bookings-service/cmd/main.go` | Create | Entry point con Gin, inyección de dependencias |
| `bookings-service/internal/application/core/booking.go` | Create | Entity Booking |
| `bookings-service/internal/application/core/service_type.go` | Create | Enum ServiceType |
| `bookings-service/internal/application/core/booking_status.go` | Create | Enum BookingStatus con Scan/Value |
| `bookings-service/internal/application/ports/repository/booking_repository.go` | Create | Repository interface |
| `bookings-service/internal/application/ports/services/booking_service.go` | Create | Service interface |
| `bookings-service/internal/application/ports/event_publisher.go` | Create | Event publisher interface |
| `bookings-service/internal/application/ports/email_client.go` | Create | Email client interface |
| `bookings-service/internal/application/services/booking_service.go` | Create | Use cases |
| `bookings-service/internal/infrastructure/persistence/booking_repo.go` | Create | GORM implementation |
| `bookings-service/internal/infrastructure/messaging/rabbitmq_publisher.go` | Create | RabbitMQ implementation |
| `bookings-service/internal/infrastructure/http/email_client.go` | Create | Identity email HTTP client |
| `bookings-service/internal/infrastructure/http/handlers.go` | Create | HTTP handlers |
| `bookings-service/internal/infrastructure/http/routes.go` | Create | Route definitions |
| `bookings-service/internal/infrastructure/db/postgres.go` | Create | Database connection |
| `bookings-service/config.yaml` | Create | Configuración |
| `bookings-service/.env.example` | Create | Variables de entorno ejemplo |
| `bookings-service/go.mod` | Create | Dependencias Go |
| `docker-compose.yml` | Modify | Agregar bookings service |

## Interfaces / Contracts

### Booking Entity

```go
package core

import (
	"database/sql/driver"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type ServiceType string

const (
	ServiceTypeTransport      ServiceType = "TRANSPORT"
	ServiceTypeSitting        ServiceType = "SITTING"
	ServiceTypeGrooming       ServiceType = "GROOMING"
	ServiceTypeVetAppointment ServiceType = "VET_APPOINTMENT"
)

func (st *ServiceType) Scan(value any) error {
	if value == nil {
		*st = ""
		return nil
	}
	switch v := value.(type) {
	case string:
		*st = ServiceType(v)
	case []byte:
		*st = ServiceType(v)
	default:
		return fmt.Errorf("cannot scan %T into ServiceType", value)
	}
	return nil
}

func (st ServiceType) Value() (driver.Value, error) {
	return string(st), nil
}

type BookingStatus string

const (
	BookingStatusPending     BookingStatus = "PENDING"
	BookingStatusConfirmed   BookingStatus = "CONFIRMED"
	BookingStatusInProgress BookingStatus = "IN_PROGRESS"
	BookingStatusCompleted   BookingStatus = "COMPLETED"
	BookingStatusCancelled  BookingStatus = "CANCELLED"
)

func (bs *BookingStatus) Scan(value any) error {
	if value == nil {
		*bs = ""
		return nil
	}
	switch v := value.(type) {
	case string:
		*bs = BookingStatus(v)
	case []byte:
		*bs = BookingStatus(v)
	default:
		return fmt.Errorf("cannot scan %T into BookingStatus", value)
	}
	return nil
}

func (bs BookingStatus) Value() (driver.Value, error) {
	return string(bs), nil
}

type Booking struct {
	gorm.Model
	CustomerID          string                 `gorm:"column:customer_id;index" json:"customerId"`
	ProviderID          *string                `gorm:"column:provider_id;index" json:"providerId"`
	ServiceType          ServiceType            `gorm:"column:service_type" json:"serviceType"`
	Status               BookingStatus          `gorm:"column:status;index" json:"status"`
	ScheduledDate        time.Time              `gorm:"column:scheduled_date" json:"scheduledDate"`
	StartTime            time.Time              `gorm:"column:start_time" json:"startTime"`
	EndTime              *time.Time             `gorm:"column:end_time" json:"endTime"`
	OriginLocation       string                 `gorm:"column:origin_location" json:"originLocation"`
	DestinationLocation  string                 `gorm:"column:destination_location" json:"destinationLocation"`
	PetID                string                 `gorm:"column:pet_id;index" json:"petId"`
	Price                float64                `gorm:"column:price" json:"price"`
	Currency             string                 `gorm:"column:currency" json:"currency"`
	Details              map[string]interface{} `gorm:"column:details;type:jsonb" json:"details"`
	Notes                string                 `gorm:"column:notes" json:"notes"`
}
```

### Repository Port

```go
package repository

import "petpay/bookings-service/internal/application/core"

type BookingRepository interface {
	Save(booking *core.Booking) (*core.Booking, error)
	FindByID(id string) (*core.Booking, error)
	FindByCustomerID(customerID string) ([]*core.Booking, error)
	FindByProviderID(providerID string) ([]*core.Booking, error)
	Update(id string, booking *core.Booking) (*core.Booking, error)
	Delete(id string) error
}
```

### Event Publisher Port

```go
package ports

type EventPublisher interface {
	PublishBookingCreated(bookingID, customerID, serviceType string, scheduledDate time.Time) error
	PublishBookingStatusChanged(bookingID, oldStatus, newStatus string) error
}
```

### Email Client Port

```go
package ports

type EmailClient interface {
	SendBookingConfirmation(to, bookingID, serviceType string, scheduledDate time.Time) error
	SendBookingStatusUpdate(to, bookingID, status string) error
}
```

### RabbitMQ Events

```go
package events

import "time"

type BookingCreatedEvent struct {
	BookingID     string    `json:"bookingId"`
	CustomerID    string    `json:"customerId"`
	ServiceType   string    `json:"serviceType"`
	ScheduledDate time.Time `json:"scheduledDate"`
	Timestamp     time.Time `json:"timestamp"`
}

type BookingStatusChangedEvent struct {
	BookingID string    `json:"bookingId"`
	OldStatus string    `json:"oldStatus"`
	NewStatus string    `json:"newStatus"`
	Timestamp time.Time `json:"timestamp"`
}
```

### Identity Email API Contract

```
POST /api/v1/emails/send
Content-Type: application/json
Authorization: Bearer {service-token}

{
  "to": "customer@email.com",
  "subject": "Booking Confirmation",
  "template": "booking-confirmation",
  "data": {
    "bookingId": "abc123",
    "serviceType": "TRANSPORT",
    "scheduledDate": "2026-03-15T10:00:00Z"
  }
}
```

O usar la interfaz existente de Nodemailer adaptada:

```go
type SendEmailRequest struct {
	Template string                 `json:"template"`
	To       string                 `json:"to"`
	Subject  string                 `json:"subject"`
	Locals   map[string]interface{} `json:"locals,omitempty"`
}
```

## Project Structure

```
bookings-service/
├── cmd/
│   └── main.go                    # Entry point
├── internal/
│   └── application/
│       ├── core/
│       │   ├── booking.go         # Entity
│       │   ├── service_type.go    # Enum
│       │   └── booking_status.go  # Enum
│       ├── ports/
│       │   ├── repository/
│       │   │   └── booking_repository.go
│       │   ├── services/
│       │   │   └── booking_service.go
│       │   ├── event_publisher.go
│       │   └── email_client.go
│       ├── services/
│       │   └── booking_service.go
│       └── events/
│           └── booking_events.go
│
│   └── infrastructure/
│       ├── http/
│       │   ├── handlers.go
│       │   └── routes.go
│       ├── messaging/
│       │   └── rabbitmq_publisher.go
│       ├── persistence/
│       │   └── booking_repo.go
│       ├── email/
│       │   └── identity_email_client.go
│       └── db/
│           └── postgres.go
├── config.yaml
├── .env.example
├── go.mod
├── go.sum
└── Dockerfile
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Domain entities, use cases | Table-driven tests con stretchr/testify |
| Integration | Repository, event publisher | Mock o testcontainers |
| API | HTTP handlers | httptest package |

### Example Unit Test

```go
package services

import (
	"testing"
	"petpay/bookings-service/internal/application/core"
)

func TestCreateBooking(t *testing.T) {
	// Arrange
	mockRepo := NewMockBookingRepository()
	service := NewBookingService(mockRepo, nil, nil)

	booking := &core.Booking{
		CustomerID:    "cust-123",
		ServiceType:   core.ServiceTypeTransport,
		ScheduledDate: time.Now().Add(24 * time.Hour),
		Status:        core.BookingStatusPending,
	}

	// Act
	created, err := service.CreateBooking(booking)

	// Assert
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if created.Status != core.BookingStatusPending {
		t.Errorf("Expected status PENDING, got %s", created.Status)
	}
}
```

## Migration / Rollout

No migration required - schema nuevo.

### Rollout:
1. Agregar servicio a docker-compose.yml
2. Crear tabla bookings con GORM AutoMigrate
3. Deployar y verificar salud
4. Actualizar nginx para routing si es necesario

## Open Questions

- [ ] Auth: ¿Cómo autenticamos requests? (API key header, JWT service-to-service)
- [ ] Provider assignment: ¿Cómo se asigna provider a un booking?
- [ ] Payment: ¿Integración con marketplace para pagos?
- [ ] Email templates: ¿Qué plantillas crear en Identity para booking-confirmation?
