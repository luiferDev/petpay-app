package http

import (
	"log"
	"net/http"
	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/ports/services"
	"github.com/gin-gonic/gin"
)

type Controller struct {
	orderService services.OrderService
}

func NewController(orderService services.OrderService) *Controller {
	return &Controller{orderService: orderService}
}

func (ctrl *Controller) CreateOrder(c *gin.Context) {
	log.Println("CreateOrder endpoint called")
	
	var order core.Order
	if err := c.ShouldBindJSON(&order); err != nil {
		log.Printf("JSON binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	log.Printf("Parsed order: %+v", order)
	
	createdOrder, err := ctrl.orderService.CreateOrder(&order)
	if err != nil {
		log.Printf("Service error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	log.Printf("Order created successfully: %+v", createdOrder)
	c.JSON(http.StatusCreated, createdOrder)
}

func (ctrl *Controller) GetAllOrders(c *gin.Context) {
	orders, err := ctrl.orderService.GetAllOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

func (ctrl *Controller) GetOrderById(c *gin.Context) {
	id := c.Param("id")
	order, err := ctrl.orderService.GetOrderById(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func (ctrl *Controller) UpdateOrder(c *gin.Context) {
	id := c.Param("id")
	var order core.Order
	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	updatedOrder, err := ctrl.orderService.UpdateOrder(id, &order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updatedOrder)
}

func (ctrl *Controller) DeleteOrder(c *gin.Context) {
	id := c.Param("id")
	if err := ctrl.orderService.DeleteOrder(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Order deleted successfully"})
}