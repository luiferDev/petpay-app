# Catalog & Offers Service - Agent Guidelines

Go / Gin / GORM / PostgreSQL

---

## Commands

```bash
# Download dependencies
go mod download

# Build the service
go build -o bin/catalog-offers ./cmd/main.go

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
catalog-&-offers/
├── cmd/
│   └── main.go              # Entry point
│
└── internal/
    └── application/
        ├── core/            # Domain entities
        │   ├── products.go
        │   ├── product_category.go
        │   ├── service_offering.go
        │   └── service_type.go
        │
        ├── ports/           # Interfaces (contracts)
        │   ├── In/
        │   │   └── product_service_port.go    # Inbound ports (service interfaces)
        │   └── Out/
        │       └── product_repository_port.go # Outbound ports (repository interfaces)
        │
        ├── adapters/        # Interface implementations
        │   └── product_adapter.go
        │
        └── services/        # (if needed, currently minimal)
            └── ...
│
└── infrastructure/
    ├── http/
    │   ├── product-controller.go  # HTTP handlers
    │   └── routes.go              # Route definitions
    │
    ├── db/
    │   └── postgres.go           # Database connection
    │
    └── repository/
        └── product_repository.go # Repository implementation
```

---

## Code Style Guidelines

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Types/Exported Functions | PascalCase | `ProductService`, `CreateProduct`, `ProductRepository` |
| Functions/Variables | camelCase | `productService`, `createProduct`, `productRepo` |
| Files | snake_case | `product_service.go`, `product_repository.go` |
| Constants (exported) | PascalCase | `DefaultPageSize`, `MaxProductsPerPage` |
| Constants (unexported) | camelCase | `defaultPageSize`, `maxProductsPerPage` |
| Database columns | snake_case | `store_profile_id`, `product_name` |
| JSON fields | camelCase | `storeProfileId`, `productName` |

---

## Domain Entities (Core)

### Product

```go
package core

import (
    "gorm.io/gorm"
)

type Product struct {
    gorm.Model
    StoreProfileId  uint64      `json:"store_profile_id" gorm:"not null"`
    CategoryId      uint64      `json:"category_id" gorm:"not null;index"`
    Name            string      `json:"product_name" gorm:"size:255;not null"`
    Description     string      `json:"description" gorm:"type:text"`
    Brand           string      `json:"brand" gorm:"size:100;type:varchar(50)"`
    Price           float64     `json:"price" gorm:"type:decimal(15,2);not null"`
    DiscountPrice   float64     `json:"discount_price" gorm:"type:decimal(10,2);default:0"`
    StockQuantity   uint64      `json:"stock_quantity" gorm:"default:0"`
    Sku             string      `json:"sku" gorm:"size:100;uniqueIndex"`
    IsActive        bool        `json:"is_active" gorm:"default:true"`
    IsFeatured      bool        `json:"is_featured" gorm:"default:false"`
    ImageUrls       []string    `json:"image_urls" gorm:"type:text[]"`
    Weight          float64     `json:"weight" gorm:"type:decimal(8,3)"`
    Dimensions      string      `json:"dimensions" gorm:"size:100;type:varchar(100)"`

    // Relations
    Category *ProductCategory `json:"category,omitempty" gorm:"foreignKey:CategoryId;references:ID"`
}
```

### ProductCategory

```go
package core

import "gorm.io/gorm"

type ProductCategory struct {
    gorm.Model
    Name        string    `json:"name" gorm:"size:100;not null;uniqueIndex"`
    Description string    `json:"description" gorm:"type:text"`
    ParentId    uint64    `json:"parent_id" gorm:"index"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    SortOrder   int       `json:"sort_order" gorm:"default:0"`
}
```

### ServiceOffering

```go
package core

import "gorm.io/gorm"

type ServiceOffering struct {
    gorm.Model
    ServiceTypeId   uint64      `json:"service_type_id" gorm:"not null;index"`
    StoreProfileId  uint64      `json:"store_profile_id" gorm:"not null;index"`
    Name            string      `json:"name" gorm:"size:255;not null"`
    Description     string      `json:"description" gorm:"type:text"`
    Price           float64     `json:"price" gorm:"type:decimal(15,2);not null"`
    DurationMinutes int         `json:"duration_minutes" gorm:"default:60"`
    IsActive        bool        `json:"is_active" gorm:"default:true"`
    IsFeatured      bool        `json:"is_featured" gorm:"default:false"`

    // Relations
    ServiceType *ServiceType `json:"service_type,omitempty" gorm:"foreignKey:ServiceTypeId;references:ID"`
}
```

### ServiceType

```go
package core

import "gorm.io/gorm"

type ServiceType struct {
    gorm.Model
    Name        string `json:"name" gorm:"size:100;not null;uniqueIndex"`
    Description string `json:"description" gorm:"type:text"`
    IconUrl     string `json:"icon_url" gorm:"size:255"`
    IsActive    bool   `json:"is_active" gorm:"default:true"`
}
```

---

## Port Interfaces

### Inbound Port (Service Interface)

```go
// internal/application/ports/In/product_service_port.go
package ports

import "petpay/catalog-offers-service/internal/application/core"

type ProductService interface {
    CreateProduct(product *core.Product) (*core.Product, error)
    GetProductById(id uint64) (*core.Product, error)
    GetAllProducts() ([]*core.Product, error)
    UpdateProduct(id uint64, product *core.Product) (*core.Product, error)
    DeleteProduct(id uint64) error
    GetProductsByCategory(categoryId uint64) ([]*core.Product, error)
    GetFeaturedProducts() ([]*core.Product, error)
}
```

### Outbound Port (Repository Interface)

```go
// internal/application/ports/Out/product_repository_port.go
package ports

import "petpay/catalog-offers-service/internal/application/core"

type ProductRepository interface {
    Create(product *core.Product) (*core.Product, error)
    FindById(id uint64) (*core.Product, error)
    FindAll() ([]*core.Product, error)
    Update(id uint64, product *core.Product) (*core.Product, error)
    Delete(id uint64) error
    FindByCategoryId(categoryId uint64) ([]*core.Product, error)
    FindFeatured() ([]*core.Product, error)
}
```

---

## Repository Implementation

```go
// internal/infrastructure/repository/product_repository.go
package repository

import (
    "petpay/catalog-offers-service/internal/application/core"
    "petpay/catalog-offers-service/internal/application/ports"
    "gorm.io/gorm"
)

type ProductRepositoryImpl struct {
    db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ports.ProductRepository {
    return &ProductRepositoryImpl{db: db}
}

func (r *ProductRepositoryImpl) Create(product *core.Product) error {
    return r.db.Create(product).Error
}

func (r *ProductRepositoryImpl) FindById(id uint64) (*core.Product, error) {
    var product core.Product
    result := r.db.Preload("Category").First(&product, id)
    if result.Error != nil {
        return nil, result.Error
    }
    return &product, nil
}

func (r *ProductRepositoryImpl) FindAll() ([]*core.Product, error) {
    var products []*core.Product
    err := r.db.Preload("Category").Find(&products).Error
    return products, err
}

func (r *ProductRepositoryImpl) Update(id uint64, product *core.Product) (*core.Product, error) {
    err := r.db.Save(product).Error
    return product, err
}

func (r *ProductRepositoryImpl) Delete(id uint64) error {
    return r.db.Delete(&core.Product{}, id).Error
}

func (r *ProductRepositoryImpl) FindByCategoryId(categoryId uint64) ([]*core.Product, error) {
    var products []*core.Product
    err := r.db.Where("category_id = ?", categoryId).Find(&products).Error
    return products, err
}

func (r *ProductRepositoryImpl) FindFeatured() ([]*core.Product, error) {
    var products []*core.Product
    err := r.db.Where("is_featured = ? AND is_active = ?", true, true).Find(&products).Error
    return products, err
}
```

---

## HTTP Controllers

```go
// internal/infrastructure/http/product-controller.go
package http

import (
    "net/http"
    "strconv"
    "github.com/gin-gonic/gin"
    "petpay/catalog-offers-service/internal/application/core"
    "petpay/catalog-offers-service/internal/application/ports"
)

type ProductController struct {
    service ports.ProductService
}

func NewProductController(service ports.ProductService) *ProductController {
    return &ProductController{service: service}
}

func (c *ProductController) CreateProduct(ctx *gin.Context) {
    var product core.Product
    if err := ctx.ShouldBindJSON(&product); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    createdProduct, err := c.service.CreateProduct(&product)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusCreated, createdProduct)
}

func (c *ProductController) GetProduct(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 64)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid product ID"})
        return
    }

    product, err := c.service.GetProductById(id)
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
        return
    }

    ctx.JSON(http.StatusOK, product)
}

func (c *ProductController) GetAllProducts(ctx *gin.Context) {
    products, err := c.service.GetAllProducts()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    ctx.JSON(http.StatusOK, products)
}

func (c *ProductController) UpdateProduct(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 64)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid product ID"})
        return
    }

    var product core.Product
    if err := ctx.ShouldBindJSON(&product); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    updatedProduct, err := c.service.UpdateProduct(id, &product)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, updatedProduct)
}

func (c *ProductController) DeleteProduct(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 64)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid product ID"})
        return
    }

    if err := c.service.DeleteProduct(id); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusNoContent, nil)
}

func (c *ProductController) GetProductsByCategory(ctx *gin.Context) {
    categoryIdStr := ctx.Query("category_id")
    categoryId, err := strconv.ParseUint(categoryIdStr, 10, 64)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid category ID"})
        return
    }

    products, err := c.service.GetProductsByCategory(categoryId)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    ctx.JSON(http.StatusOK, products)
}

func (c *ProductController) GetFeaturedProducts(ctx *gin.Context) {
    products, err := c.service.GetFeaturedProducts()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    ctx.JSON(http.StatusOK, products)
}
```

---

## Routes

```go
// internal/infrastructure/http/routes.go
package http

import (
    "github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, controller *ProductController) {
    products := router.Group("/api/v1/products")
    {
        products.POST("", controller.CreateProduct)
        products.GET("/:id", controller.GetProduct)
        products.GET("", controller.GetAllProducts)
        products.PUT("/:id", controller.UpdateProduct)
        products.DELETE("/:id", controller.DeleteProduct)
        products.GET("/category/:category_id", controller.GetProductsByCategory)
        products.GET("/featured", controller.GetFeaturedProducts)
    }
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
    "petpay/catalog-offers-service/internal/infrastructure/db"
    "petpay/catalog-offers-service/internal/infrastructure/http"
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

    // Setup routes (simplified - would normally wire up controllers/services/repos)
    router := gin.Default()
    http.SetupRoutes(router, nil) // Pass properly initialized controller

    router.Run(":8081")
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

## Testing

```go
package repository

import (
    "testing"
    "petpay/catalog-offers-service/internal/application/core"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil {
        t.Fatalf("Failed to create test database: %v", err)
    }
    db.AutoMigrate(&core.Product{}, &core.ProductCategory{})
    return db
}

func TestCreateProduct(t *testing.T) {
    db := setupTestDB(t)
    repo := NewProductRepository(db)

    product := &core.Product{
        Name:          "Test Product",
        Description:   "Test Description",
        Price:         99.99,
        StockQuantity: 10,
        Sku:           "TEST-001",
        IsActive:      true,
    }

    err := repo.Create(product)
    if err != nil {
        t.Fatalf("Expected no error, got %v", err)
    }

    if product.ID == 0 {
        t.Error("Expected product ID to be set")
    }
}

func TestFindProductById(t *testing.T) {
    db := setupTestDB(t)
    repo := NewProductRepository(db)

    product := &core.Product{
        Name:    "Test Product",
        Price:   99.99,
        Sku:     "TEST-001",
        IsActive: true,
    }
    repo.Create(product)

    found, err := repo.FindById(product.ID)
    if err != nil {
        t.Fatalf("Expected no error, got %v", err)
    }

    if found.Name != "Test Product" {
        t.Errorf("Expected product name 'Test Product', got '%s'", found.Name)
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
feat(catalog): add product listing endpoint
fix(catalog): resolve category filter bug
refactor(catalog): extract product service interface
```

---

## Environment Variables

Create `.env` file (never commit):
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/petpay_catalog

# Server
PORT=8081
```

---

## Project-Specific Notes

- Uses **GORM** as ORM (same as Marketplace)
- Port naming convention: `In/` for inbound (service interfaces), `Out/` for outbound (repository interfaces)
- Has adapter pattern implementation in `adapters/`
- Supports:
  - Products with categories
  - Service offerings with service types
  - Featured products
  - Product search by category
- Distinct feature flags: `isActive`, `isFeatured`
