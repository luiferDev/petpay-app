# Marketplace Service - Agent Guidelines

Go / Gin / GORM / PostgreSQL

---

## Commands

```bash
# Download dependencies
go mod download

# Build the service
go build -o bin/marketplace ./cmd/main.go

# Run development
go run ./cmd/main.go

# Run tests
go test ./...

# Run single test
go test -v -run TestFunctionName ./internal/application

# Run tests with coverage
go test -cover ./...

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
marketplace/
├── cmd/
│   └── main.go              # Entry point
│
└── internal/
    └── application/
        ├── core/            # Domain entities
        │   ├── order.go
        │   ├── orderItem.go
        │   └── orderStatus.go
        │
        ├── ports/           # Interfaces (contracts)
        │   ├── repository/
        │   │   └── order_repository_port.go
        │   └── services/
        │       └── order_service_port.go
        │
        ├── services/        # Service implementations
        │   └── order_service.go
        │
        └── adapters/        # Interface implementations (if needed)
            └── ...
│
└── infrastructure/
    ├── http/
    │   ├── controller.go    # HTTP handlers
    │   └── routes.go        # Route definitions
    │
    ├── db/
    │   └── postgres.go      # Database connection
    │
    └── repository/
        └── postgres_order_repository.go
```

---

## Code Style Guidelines

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Types/Exported Functions | PascalCase | `OrderService`, `CreateOrder`, `OrderRepository` |
| Functions/Variables | camelCase | `orderService`, `createOrder`, `orderRepo` |
| Files | snake_case | `order_service.go`, `postgres_repository.go` |
| Constants (exported) | PascalCase | `DefaultPageSize`, `MaxRetries` |
| Constants (unexported) | camelCase | `defaultPageSize`, `maxRetries` |
| Database columns | snake_case | `order_number`, `customer_id` |
| JSON fields | camelCase | `orderNumber`, `customerId` |

---

## Struct Definitions

### Domain Entities (Core)

```go
package core

import "gorm.io/gorm"

type Order struct {
    gorm.Model
    OrderNumber      uint64      `gorm:"column:order_number" json:"orderNumber"`
    CustomerId       string      `gorm:"column:customer_id; index" json:"customerId"`
    StoreProfileId   string      `gorm:"column:store_profile_id; index" json:"storeProfileId"`
    Status           OrderStatus `gorm:"type:varchar(255); default:'PENDING'; column:status" json:"status"`
    Subtotal         float64     `gorm:"column:subtotal" json:"subtotal"`
    ShippingCost     float64     `gorm:"column:shipping_cost" json:"shippingCost"`
    Tax              float64     `gorm:"column:tax" json:"tax"`
    Discount         float64     `gorm:"column:discount" json:"discount"`
    TotalAmount      float64     `gorm:"column:total_amount" json:"totalAmount"`
    Currency         float64     `gorm:"column:currency" json:"currency"`
    ShippingAddressId string     `gorm:"column:shipping_address_id; index" json:"shippingAddressId"`
    BillingAddressId  string     `gorm:"column:billing_address_id; index" json:"billingAddressId"`
    TrackingNumber   uint64     `gorm:"column:tracking_number" json:"trackingNumber"`
    ShippingCarrier  string      `gorm:"column:shipping_carrier" json:"shippingCarrier"`
    CustomerNotes    string      `gorm:"column:customer_notes" json:"customerNotes"`
    InternalNotes    string      `gorm:"column:internal_notes" json:"internalNotes"`
    EstimatedDelivery string     `gorm:"column:estimated_delivery" json:"estimatedDelivery"`
    ActualDelivery   string      `gorm:"column:actual_delivery" json:"actualDelivery"`
    Items            []OrderItem `gorm:"foreignKey:OrderID"`
}
```

### Enum Types (Status)

```go
package core

type OrderStatus string

const (
    StatusPending   OrderStatus = "PENDING"
    StatusConfirmed OrderStatus = "CONFIRMED"
    StatusShipped   OrderStatus = "SHIPPED"
    StatusDelivered OrderStatus = "DELIVERED"
    StatusCancelled OrderStatus = "CANCELLED"
)
```

---

## Error Handling

### Return Errors Explicitly

```go
package services

import (
    "fmt"
    "petpay/marketplace-service/internal/application/core"
    "petpay/marketplace-service/internal/application/ports/repository"
)

type OrderServiceImpl struct {
    repo repository.OrderRepository
}

func NewOrderService(repo repository.OrderRepository) services.OrderService {
    return &OrderServiceImpl{repo: repo}
}

func (s *OrderServiceImpl) GetOrderById(id string) (*core.Order, error) {
    order, err := s.repo.FindById(id)
    if err != nil {
        return nil, fmt.Errorf("failed to get order %s: %w", id, err)
    }
    if order == nil {
        return nil, fmt.Errorf("order not found: %s", id)
    }
    return order, nil
}
```

### Custom Errors (Optional)

```go
package core

import "errors"

var (
    ErrOrderNotFound     = errors.New("order not found")
    ErrInvalidOrder      = errors.New("invalid order data")
    ErrOrderAlreadyExists = errors.New("order already exists")
)
```

---

## Repository Pattern

### Port Interface (in ports/repository/)

```go
package repository

import "petpay/marketplace-service/internal/application/core"

type OrderRepository interface {
    Save(order *core.Order) (*core.Order, error)
    FindById(id string) (*core.Order, error)
    FindAll() ([]*core.Order, error)
    Update(id string, order *core.Order) (*core.Order, error)
    Delete(id string) error
}
```

### Repository Implementation (in infrastructure/repository/)

```go
package repository

import (
    "petpay/marketplace-service/internal/application/core"
    "petpay/marketplace-service/internal/application/ports/repository"
    "gorm.io/gorm"
)

type PostgresOrderRepository struct {
    db *gorm.DB
}

func NewPostgresOrderRepository(db *gorm.DB) repository.OrderRepository {
    return &PostgresOrderRepository{db: db}
}

func (r *PostgresOrderRepository) Save(order *core.Order) (*core.Order, error) {
    err := r.db.Create(order).Error
    if err != nil {
        return nil, err
    }
    return order, nil
}

func (r *PostgresOrderRepository) FindById(id string) (*core.Order, error) {
    var order core.Order
    result := r.db.First(&order, "id = ?", id)
    if result.Error != nil {
        return nil, result.Error
    }
    return &order, nil
}

// ... other methods
```

---

## Service Layer

### Service Port Interface (in ports/services/)

```go
package services

import "petpay/marketplace-service/internal/application/core"

type OrderService interface {
    CreateOrder(order *core.Order) (*core.Order, error)
    GetOrderById(id string) (*core.Order, error)
    GetAllOrders() ([]*core.Order, error)
    UpdateOrder(id string, order *core.Order) (*core.Order, error)
    DeleteOrder(id string) error
}
```

### Service Implementation (in services/)

```go
package services

import (
    "petpay/marketplace-service/internal/application/core"
    "petpay/marketplace-service/internal/application/ports/repository"
    "petpay/marketplace-service/internal/application/ports/services"
)

type OrderServiceImpl struct {
    repo repository.OrderRepository
}

func NewOrderService(repo repository.OrderRepository) services.OrderService {
    return &OrderServiceImpl{repo: repo}
}

func (s *OrderServiceImpl) CreateOrder(order *core.Order) (*core.Order, error) {
    // Business logic
    order.Status = core.StatusPending
    
    // Validate order
    if order.CustomerId == "" {
        return nil, fmt.Errorf("customer ID is required")
    }
    
    return s.repo.Save(order)
}

func (s *OrderServiceImpl) GetAllOrders() ([]*core.Order, error) {
    return s.repo.FindAll()
}

func (s *OrderServiceImpl) GetOrderById(id string) (*core.Order, error) {
    return s.repo.FindById(id)
}

func (s *OrderServiceImpl) UpdateOrder(id string, order *core.Order) (*core.Order, error) {
    return s.repo.Update(id, order)
}

func (s *OrderServiceImpl) DeleteOrder(id string) error {
    return s.repo.Delete(id)
}
```

---

## HTTP Controllers

### Gin Handlers (in infrastructure/http/)

```go
package http

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "petpay/marketplace-service/internal/application/core"
    "petpay/marketplace-service/internal/application/ports/services"
)

type OrderController struct {
    service services.OrderService
}

func NewOrderController(service services.OrderService) *OrderController {
    return &OrderController{service: service}
}

func (c *OrderController) CreateOrder(ctx *gin.Context) {
    var order core.Order
    if err := ctx.ShouldBindJSON(&order); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    createdOrder, err := c.service.CreateOrder(&order)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusCreated, createdOrder)
}

func (c *OrderController) GetOrder(ctx *gin.Context) {
    id := ctx.Param("id")
    order, err := c.service.GetOrderById(id)
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
        return
    }
    ctx.JSON(http.StatusOK, order)
}

func (c *OrderController) GetAllOrders(ctx *gin.Context) {
    orders, err := c.service.GetAllOrders()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    ctx.JSON(http.StatusOK, orders)
}
```

---

## Routes

```go
package http

import (
    "github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, controller *OrderController) {
    orders := router.Group("/api/v1/orders")
    {
        orders.POST("", controller.CreateOrder)
        orders.GET("/:id", controller.GetOrder)
        orders.GET("", controller.GetAllOrders)
        orders.PUT("/:id", controller.UpdateOrder)
        orders.DELETE("/:id", controller.DeleteOrder)
    }
}
```

---

## Database Connection

```go
package db

import (
    "log"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewPostgresConnection(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        return nil, err
    }

    log.Println("Database connection established")
    return db, nil
}
```

---

## Main Entry Point

```go
package main

import (
    "log"
    "os"
    "github.com/joho/godotenv"
    "petpay/marketplace-service/internal/application/ports/repository"
    "petpay/marketplace-service/internal/application/ports/services"
    servicesImpl "petpay/marketplace-service/internal/application/services"
    "petpay/marketplace-service/internal/infrastructure/db"
    "petpay/marketplace-service/internal/infrastructure/http"
    repositoryImpl "petpay/marketplace-service/internal/infrastructure/repository"
    "github.com/gin-gonic/gin"
)

func main() {
    // Load .env
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    // Database connection
    dsn := os.Getenv("DATABASE_URL")
    database, err := db.NewPostgresConnection(dsn)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Dependencies
    orderRepo := repositoryImpl.NewPostgresOrderRepository(database)
    orderService := servicesImpl.NewOrderService(orderRepo)
    orderController := http.NewOrderController(orderService)

    // HTTP Server
    router := gin.Default()
    http.SetupRoutes(router, orderController)

    router.Run(":8080")
}
```

---

## Testing

```go
package services

import (
    "testing"
    "petpay/marketplace-service/internal/application/core"
)

// Mock repository
type MockOrderRepository struct {
    orders map[string]*core.Order
}

func NewMockOrderRepository() *MockOrderRepository {
    return &MockOrderRepository{
        orders: make(map[string]*core.Order),
    }
}

func (m *MockOrderRepository) Save(order *core.Order) (*core.Order, error) {
    m.orders[order.ID] = order
    return order, nil
}

func (m *MockOrderRepository) FindById(id string) (*core.Order, error) {
    if order, ok := m.orders[id]; ok {
        return order, nil
    }
    return nil, nil
}

// Tests
func TestCreateOrder(t *testing.T) {
    mockRepo := NewMockOrderRepository()
    service := NewOrderService(mockRepo)

    order := &core.Order{
        CustomerId:   "cust-123",
        StoreProfileId: "store-456",
        TotalAmount: 100.00,
    }

    created, err := service.CreateOrder(order)
    if err != nil {
        t.Fatalf("Expected no error, got %v", err)
    }

    if created.Status != core.StatusPending {
        t.Errorf("Expected status PENDING, got %s", created.Status)
    }
}

func TestGetOrderNotFound(t *testing.T) {
    mockRepo := NewMockOrderRepository()
    service := NewOrderService(mockRepo)

    _, err := service.GetOrderById("nonexistent")
    if err == nil {
        t.Error("Expected error for nonexistent order")
    }
}
```

---

## Git Conventions

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `chore:` Maintenance
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests

Examples:
```
feat(marketplace): add order creation endpoint
fix(marketplace): resolve order status update bug
refactor(marketplace): extract repository interface
```

---

## Environment Variables

Create `.env` file (never commit):
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/petpay_marketplace

# Server
PORT=8080
```

---

## Project-Specific Notes

- Uses **GORM** as ORM (not Drizzle like Identity)
- Hexagonal architecture with clear separation: `core/` → `ports/` → `services/` → `infrastructure/`
- All domain logic goes in `core/`
- Ports define interfaces, services implement them
- Infrastructure implements repository ports
