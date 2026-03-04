package http

import (
	"log"
	"net/http"
	"petpay/catalog-offers-service/internal/application/core"
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
	var product core.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		log.Printf("JSON binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Parsed order: %+v", product)

	createdProduct, err := ctrl.productService.CreateProduct(&product)
	if err != nil {
		log.Printf("Service error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Product created successfully: %+v", createdProduct)
	c.JSON(http.StatusCreated, createdProduct)
}

func (ctrl *Controller) GetAll(c *gin.Context) {
	products, err := ctrl.productService.FindAllProducts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, products)
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
	c.JSON(http.StatusOK, product)
}

func (ctrl *Controller) FindAllByCategory(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category parameter is required"})
		return
	}
	products, err := ctrl.productService.FindProductsByCategory(category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, products)
}

func (ctrl *Controller) Update(c *gin.Context) {
	id := c.Param("id")
	var product core.Product

	parsedId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedOrder, err := ctrl.productService.UpdateProduct(uint(parsedId), &product)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updatedOrder)
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
