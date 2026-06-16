package http

import (
	"log"
	"net/http"
	"petpay/catalog-offers-service/internal/application/core"
	"petpay/catalog-offers-service/internal/application/dto"
	"petpay/catalog-offers-service/internal/application/ports/in"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Controller struct {
	productService in.ProductServicePort
}

func NewController(productService in.ProductServicePort) *Controller {
	return &Controller{
		productService: productService,
	}
}

// HealthCheckHandler verifica el estado de salud del servicio
func HealthCheckHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "catalog",
		"timestamp": gin.H{"$date": gin.H{"$numberLong": "0"}},
		"uptime":    0,
	})
}

// ReadyCheckHandler verifica si el servicio está listo para recibir tráfico
func ReadyCheckHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"service":   "catalog",
		"timestamp": gin.H{"$date": gin.H{"$numberLong": "0"}},
		"uptime":    0,
	})
}

func (ctrl *Controller) Create(c *gin.Context) {
	log.Println("Create Product endpoint called")
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("JSON binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	product := dto.CreateRequestToProduct(&req)
	createdProduct, err := ctrl.productService.CreateProduct(product)
	if err != nil {
		log.Printf("Service error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	log.Printf("Product created successfully: ID=%d", createdProduct.ID)
	c.JSON(http.StatusCreated, dto.ProductToResponse(createdProduct))
}

func (ctrl *Controller) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	result, err := ctrl.productService.FindAllProducts(page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	products := result.Data.([]*core.Product)
	response := dto.NewPaginatedResponse(
		dto.ProductsToListResponse(products),
		result.Page, result.Limit, result.Total,
	)
	c.JSON(http.StatusOK, response)
}

func (ctrl *Controller) GetOneById(c *gin.Context) {
	id := c.Param("id")
	parsedId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	product, err := ctrl.productService.FindProductById(uint(parsedId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.ProductToResponse(product))
}

func (ctrl *Controller) FindAllByCategory(c *gin.Context) {
	categoryIdStr := c.Query("category_id")
	if categoryIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category ID parameter is required"})
		return
	}
	categoryId, err := strconv.ParseUint(categoryIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID format"})
		return
	}
	products, err := ctrl.productService.FindProductsByCategory(categoryId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.ProductsToListResponse(products))
}

func (ctrl *Controller) Update(c *gin.Context) {
	id := c.Param("id")
	parsedId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existingProduct, err := ctrl.productService.FindProductById(uint(parsedId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	dto.ApplyUpdatesToProduct(existingProduct, &req)

	updatedProduct, err := ctrl.productService.UpdateProduct(uint(parsedId), existingProduct)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.ProductToResponse(updatedProduct))
}

func (ctrl *Controller) Delete(c *gin.Context) {
	id := c.Param("id")
	parsedId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	if err := ctrl.productService.DeleteProduct(uint(parsedId)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}
