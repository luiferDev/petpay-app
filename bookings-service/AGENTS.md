# Bookings Service - Agent Guidelines

Go / Gin / GORM / PostgreSQL / RabbitMQ

---

## Commands

```bash
# Download dependencies
go mod download

# Build the service
go build -o bin/bookings ./cmd/main.go

# Run development
go run ./cmd/main.go

# Run tests
go test ./...

# Run single test (by function name)
go test -v -run TestCreateBooking ./internal/application

# Run single test (exact name)
go test -v -run "^TestCreateBooking$" .

# Run tests with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...

# Run with race detector
go test -race ./...

# Lint (install golangci-lint first)
golangci-lint run

# Format code
go fmt ./...

# Tidy dependencies
go mod tidy
```

---

## Project Structure (Hexagonal Architecture)

```
bookings-service/
├── cmd/
│   └── main.go              # Entry point with DI
│
├── internal/
│   ├── domain/              # Domain entities & enums
│   │   ├── booking.go
│   │   ├── booking_status.go
│   │   └── service_type.go
│   │
│   ├── ports/               # Interface contracts
│   │   ├── booking_repository.go
│   │   ├── event_publisher.go
│   │   └── email_client.go
│   │
│   ├── application/         # Use cases / business logic
│   │   └── booking_service.go
│   │
│   └── infrastructure/      # Adapters implementations
│       ├── config/
│       │   └── config.go
│       ├── persistence/
│       │   └── booking_repository.go
│       ├── messaging/
│       │   └── rabbitmq_publisher.go
│       └── http/
│           ├── handlers.go
│           ├── router.go
│           ├── request_models.go
│           └── identity_email_client.go
│
├── config.yaml              # Configuration file
├── Dockerfile
└── Makefile
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Types/Exported Functions | PascalCase | `BookingService`, `CreateBooking`, `BookingRepository` |
| Functions/Variables | camelCase | `bookingService`, `createBooking`, `bookingRepo` |
| Files | snake_case | `booking_service.go`, `booking_repository.go` |
| Constants (exported) | PascalCase | `DefaultPageSize`, `MaxRetries` |
| Constants (unexported) | camelCase | `defaultPageSize`, `maxRetries` |
| Database columns | snake_case | `customer_id`, `service_type` |
| JSON fields | camelCase | `customerId`, `serviceType` |

---

## Domain Entities

### Booking Entity

```go
package domain

import (
    "time"
    "gorm.io/gorm"
)

type ServiceType string

const (
    ServiceTypeTransport       ServiceType = "TRANSPORT"
    ServiceTypeSitting        ServiceType = "SITTING"
    ServiceTypeGrooming      ServiceType = "GROOMING"
    ServiceTypeVetAppointment ServiceType = "VET_APPOINTMENT"
)

// Scan/Value for GORM JSONB support
func (st *ServiceType) Scan(value interface{}) error { /* ... */ }
func (st ServiceType) Value() (driver.Value, error) { /* ... */ }

type BookingStatus string

const (
    BookingStatusPending     BookingStatus = "PENDING"
    BookingStatusConfirmed  BookingStatus = "CONFIRMED"
    BookingStatusInProgress BookingStatus = "IN_PROGRESS"
    BookingStatusCompleted  BookingStatus = "COMPLETED"
    BookingStatusCancelled  BookingStatus = "CANCELLED"
)

type Booking struct {
    gorm.Model
    CustomerID           string                 `gorm:"column:customer_id;index" json:"customerId"`
    ProviderID           *string                `gorm:"column:provider_id;index" json:"providerId"`
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

func (Booking) TableName() string {
    return "bookings"
}
```

---

## Ports (Interfaces)

### Repository Port

```go
package ports

import (
    "context"
    "petpay/bookings-service/internal/domain"
)

type BookingRepository interface {
    Create(ctx context.Context, booking *domain.Booking) error
    FindByID(ctx context.Context, id string) (*domain.Booking, error)
    FindByCustomerID(ctx context.Context, customerID string) ([]*domain.Booking, error)
    FindByProviderID(ctx context.Context, providerID string) ([]*domain.Booking, error)
    FindByPetID(ctx context.Context, petID string) ([]*domain.Booking, error)
    Update(ctx context.Context, booking *domain.Booking) error
    Delete(ctx context.Context, id string) error
}
```

### Event Publisher Port

```go
package ports

import "context"

type BookingEvent struct {
    EventType   string
    BookingID   string
    CustomerID  string
    ServiceType string
    Status      string
    Timestamp   string
}

type EventPublisher interface {
    PublishBookingCreated(ctx context.Context, event *BookingEvent) error
    PublishBookingStatusChanged(ctx context.Context, event *BookingEvent) error
}
```

### Email Client Port

```go
package ports

import "context"

type EmailRequest struct {
    To       string
    Subject  string
    Template string
    Data     map[string]interface{}
}

type EmailClient interface {
    SendConfirmation(ctx context.Context, req *EmailRequest) error
}
```

---

## Application Layer (Use Cases)

```go
package application

import (
    "context"
    "petpay/bookings-service/internal/domain"
    "petpay/bookings-service/internal/ports"
)

type BookingService struct {
    repo     ports.BookingRepository
    publisher ports.EventPublisher
    emailClient ports.EmailClient
}

func NewBookingService(
    repo ports.BookingRepository,
    publisher ports.EventPublisher,
    emailClient ports.EmailClient,
) *BookingService {
    return &BookingService{
        repo:         repo,
        publisher:    publisher,
        emailClient:  emailClient,
    }
}

func (s *BookingService) CreateBooking(ctx context.Context, req *CreateBookingRequest) (*domain.Booking, error) {
    // Validate input
    if req.CustomerID == "" {
        return nil, fmt.Errorf("customer ID is required")
    }
    
    // Create booking
    booking := &domain.Booking{
        CustomerID:          req.CustomerID,
        ServiceType:        domain.ServiceType(req.ServiceType),
        Status:              domain.BookingStatusPending,
        ScheduledDate:       req.ScheduledDate,
        // ... other fields
    }
    
    // Save to DB
    err := s.repo.Create(ctx, booking)
    if err != nil {
        return nil, fmt.Errorf("failed to create booking: %w", err)
    }
    
    // Publish event (fire & forget)
    go s.publisher.PublishBookingCreated(ctx, &ports.BookingEvent{ /* ... */ })
    
    // Send email (fire & forget)
    go s.emailClient.SendConfirmation(ctx, &ports.EmailRequest{ /* ... */ })
    
    return booking, nil
}
```

---

## HTTP Handlers

```go
package http

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

type BookingHandler struct {
    service *application.BookingService
}

func NewBookingHandler(service *application.BookingService) *BookingHandler {
    return &BookingHandler{service: service}
}

func (h *BookingHandler) CreateBooking(c *gin.Context) {
    var req CreateBookingRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    booking, err := h.service.CreateBooking(c.Request.Context(), &req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, booking)
}

func (h *BookingHandler) GetBooking(c *gin.Context) {
    id := c.Param("id")
    booking, err := h.service.GetBookingByID(c.Request.Context(), id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
        return
    }
    c.JSON(http.StatusOK, booking)
}

func (h *BookingHandler) ListBookings(c *gin.Context) {
    customerID := c.Query("customerId")
    status := c.Query("status")
    
    bookings, err := h.service.ListBookings(c.Request.Context(), customerID, status)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, bookings)
}

func (h *BookingHandler) UpdateStatus(c *gin.Context) {
    id := c.Param("id")
    var req UpdateStatusRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    booking, err := h.service.UpdateStatus(c.Request.Context(), id, req.Status)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, booking)
}
```

---

## Routes

```go
func SetupRoutes(r *gin.Engine, h *BookingHandler) {
    bookings := r.Group("/api/v1/bookings")
    {
        bookings.POST("", h.CreateBooking)
        bookings.GET("/:id", h.GetBooking)
        bookings.GET("", h.ListBookings)
        bookings.PATCH("/:id/status", h.UpdateStatus)
        bookings.DELETE("/:id", h.CancelBooking)
    }
    
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "healthy"})
    })
}
```

---

## RabbitMQ Publisher

```go
package messaging

import (
    "context"
    "encoding/json"
    "fmt"
    amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQPublisher struct {
    conn    *amqp.Connection
    channel *amqp.Channel
}

func NewRabbitMQPublisher(url string) (*RabbitMQPublisher, error) {
    conn, err := amqp.Dial(url)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
    }
    
    ch, err := conn.Channel()
    if err != nil {
        return nil, fmt.Errorf("failed to open channel: %w", err)
    }
    
	// Declare exchange
	err = ch.ExchangeDeclare("petpay.domain.events", "topic", true, false, false, false, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}
	
	return &RabbitMQPublisher{conn: conn, channel: ch}, nil
}

func (p *RabbitMQPublisher) PublishBookingCreated(ctx context.Context, event *ports.BookingEvent) error {
	body, _ := json.Marshal(event)
	return p.channel.PublishWithContext(ctx,
		"petpay.domain.events",
        "booking.created",
        false, false,
        amqp.Publishing{
            ContentType: "application/json",
            Body:        body,
        },
    )
}
```

---

## Identity Email Client

```go
package http

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "petpay/bookings-service/internal/ports"
)

type IdentityEmailClient struct {
    baseURL string
    apiKey  string
    client  *http.Client
}

func NewIdentityEmailClient(baseURL, apiKey string) *IdentityEmailClient {
    return &IdentityEmailClient{
        baseURL: baseURL,
        apiKey:   apiKey,
        client:   &http.Client{},
    }
}

func (c *IdentityEmailClient) SendConfirmation(ctx context.Context, req *ports.EmailRequest) error {
    jsonData, _ := json.Marshal(req)
    httpReq, _ := http.NewRequestWithContext(ctx, "POST",
        c.baseURL+"/api/v1/emails/send", bytes.NewBuffer(jsonData))
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
    
    resp, err := c.client.Do(httpReq)
    if err != nil {
        return fmt.Errorf("failed to send email: %w", err)
    }
    defer resp.Body.Close()
    return nil
}
```

---

## Main Entry Point

```go
package main

import (
    "log"
    "github.com/joho/godotenv"
    "petpay/bookings-service/internal/application"
    "petpay/bookings-service/internal/infrastructure/config"
    "petpay/bookings-service/internal/infrastructure/http"
    "petpay/bookings-service/internal/infrastructure/messaging"
    "petpay/bookings-service/internal/infrastructure/persistence"
    "github.com/gin-gonic/gin"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func main() {
    godotenv.Load()
    
    cfg, err := config.Load("config.yaml")
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    // Database
    db, err := gorm.Open(postgres.Open(cfg.Database.DSN), &gorm.Config{})
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    
    // Infrastructure
    repo := persistence.NewBookingRepository(db)
    publisher, _ := messaging.NewRabbitMQPublisher(cfg.RabbitMQ.URL)
    emailClient := http.NewIdentityEmailClient(cfg.Identity.BaseURL, cfg.Identity.APIKey)
    
    // Application
    service := application.NewBookingService(repo, publisher, emailClient)
    
    // HTTP
    handler := http.NewBookingHandler(service)
    router := gin.Default()
    http.SetupRoutes(router, handler)
    
    router.Run(cfg.App.Host + ":" + cfg.App.Port)
}
```

---

## Configuration (config.yaml)

```yaml
app:
  host: "0.0.0.0"
  port: 8082

database:
  dsn: "postgresql://user:password@postgres:5432/petpay_bookings"

rabbitmq:
  url: "amqp://guest:guest@rabbitmq:5672/"

identity:
  base_url: "http://identity:3000"
  api_key: "${IDENTITY_API_KEY}"
```

---

## Testing

```go
package application

import (
    "testing"
    "context"
)

// Mock repository
type MockBookingRepository struct {
    bookings map[string]*domain.Booking
}

func NewMockBookingRepository() *MockBookingRepository {
    return &MockBookingRepository{bookings: make(map[string]*domain.Booking)}
}

func (m *MockBookingRepository) Create(ctx context.Context, b *domain.Booking) error {
    m.bookings[b.ID] = b
    return nil
}

func TestCreateBooking(t *testing.T) {
    mockRepo := NewMockBookingRepository()
    service := NewBookingService(mockRepo, nil, nil)
    
    req := &CreateBookingRequest{
        CustomerID:   "cust-123",
        ServiceType:  "GROOMING",
        ScheduledDate: time.Now().Add(24 * time.Hour),
    }
    
    booking, err := service.CreateBooking(context.Background(), req)
    if err != nil {
        t.Fatalf("Expected no error, got %v", err)
    }
    
    if booking.Status != domain.BookingStatusPending {
        t.Errorf("Expected status PENDING, got %s", booking.Status)
    }
}
```

---

## Git Conventions

```
feat(bookings): add booking creation endpoint
fix(bookings): resolve booking status update bug
refactor(bookings): extract repository interface
```

---

## Environment Variables

Create `.env` file (never commit):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/petpay_bookings
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
IDENTITY_API_KEY=your-api-key-here
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings/:id` | Get booking by ID |
| GET | `/api/v1/bookings?customerId=X&status=Y` | List bookings (filters) |
| PATCH | `/api/v1/bookings/:id/status` | Update booking status |
| DELETE | `/api/v1/bookings/:id` | Cancel booking |
| GET | `/health` | Health check |

---

## Project-Specific Notes

- Uses **GORM** as ORM (same as Marketplace, Catalog)
- Hexagonal architecture with clear separation: `domain/` → `ports/` → `application/` → `infrastructure/`
- RabbitMQ for async events, HTTP to Identity for emails
- JSONB for service-specific details in Booking entity
- Service-to-service auth via API key in Authorization header
