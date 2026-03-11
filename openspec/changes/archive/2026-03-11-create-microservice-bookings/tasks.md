# Tasks: Bookings Microservice

## Phase 1: Project Setup & Configuration

- [x] 1.1 Create `bookings-service/` root directory
- [x] 1.2 Create `bookings-service/go.mod` with module name `petpay/bookings-service` and Go 1.21
- [x] 1.3 Create `bookings-service/config.yaml` with:
  - `app.host`: "0.0.0.0"
  - `app.port`: 8082
  - `database.dsn`: PostgreSQL connection string
  - `rabbitmq.url`: RabbitMQ connection string
  - `identity.base_url`: "http://identity:3000"
  - `identity.api_key`: service token for auth
- [x] 1.4 Create `bookings-service/Makefile` with targets: run, build, test, lint

## Phase 2: Domain Layer (Entities & Enums)

- [x] 2.1 Create `bookings-service/internal/domain/service_type.go` with ServiceType enum
- [x] 2.2 Create `bookings-service/internal/domain/booking_status.go` with BookingStatus enum
- [x] 2.3 Create `bookings-service/internal/domain/booking.go` with Booking entity struct
- [x] 2.4 Add GORM hooks for JSONB fields in `booking.go`

## Phase 3: Ports Layer (Interfaces)

- [x] 3.1 Create `bookings-service/internal/ports/booking_repository.go` with Repository interface
- [x] 3.2 Create `bookings-service/internal/ports/event_publisher.go` with EventPublisher interface
- [x] 3.3 Create `bookings-service/internal/ports/email_client.go` with EmailClient interface

## Phase 4: Infrastructure Layer (Adapters)

- [x] 4.1 Create `bookings-service/internal/infrastructure/config/config.go` to load config.yaml
- [x] 4.2 Create `bookings-service/internal/infrastructure/persistence/booking_repository.go` - GORM implementation
- [x] 4.3 Create `bookings-service/internal/infrastructure/messaging/rabbitmq_publisher.go` - RabbitMQ implementation
- [x] 4.4 Create `bookings-service/internal/infrastructure/http/identity_email_client.go` - REST client to Identity email service

## Phase 5: Application Layer (Use Cases)

- [x] 5.1 Create `bookings-service/internal/application/booking_service.go` with business logic
- [x] 5.2 Implement CreateBooking use case with email trigger
- [x] 5.3 Implement GetBooking use case
- [x] 5.4 Implement ListBookings use case with filters
- [x] 5.5 Implement UpdateBookingStatus use case with event publishing

## Phase 6: HTTP Handlers & Entry Point

- [x] 6.1 Create `bookings-service/internal/infrastructure/http/handlers.go` with Gin handlers
- [x] 6.2 Create `bookings-service/internal/infrastructure/http/request_models.go` with DTOs
- [x] 6.3 Create `bookings-service/internal/infrastructure/http/router.go` to setup Gin routes
- [x] 6.4 Create `bookings-service/cmd/main.go` - entry point with dependency injection

## Phase 7: Docker Integration

- [x] 7.1 Update `docker-compose.yml` to add bookings-service:
  - Service name: bookings
  - Build: ./bookings-service
  - Port: 8082
  - Environment variables from config
  - Depends on: postgres, rabbitmq
- [x] 7.2 Create `bookings-service/Dockerfile`

## Phase 8: Testing

- [x] 8.1 Write unit tests for domain entities (`domain/*_test.go`)
- [x] 8.2 Write unit tests for use cases (`application/*_test.go`)
- [x] 8.3 Write handler tests with httptest (`http/*_test.go`)
- [x] 8.4 Run `go test ./...` and fix failures

## Phase 9: Lint & Polish

- [x] 9.1 Run `go fmt ./...`
- [x] 9.2 Run `go mod tidy`
- [x] 9.3 Run `golangci-lint run` and fix issues
- [x] 9.4 Verify all imports are correct

## Phase 10: Integration Verification

- [ ] 10.1 Run `docker-compose up --build` and verify service starts (MANUAL - requires Docker)
- [ ] 10.2 Test POST /api/v1/bookings creates booking
- [ ] 10.3 Test GET /api/v1/bookings/:id returns booking
- [ ] 10.4 Verify RabbitMQ event is published
- [ ] 10.5 Verify email is sent via Identity service
