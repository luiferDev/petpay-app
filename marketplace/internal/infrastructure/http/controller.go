package http

import (
	"log"
	"net/http"
	"strconv"

	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/dto"
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

	var req dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("JSON binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Parsed create order request for customer: %s", req.CustomerId)

	order := dto.CreateRequestToOrder(&req)

	createdOrder, err := ctrl.orderService.CreateOrder(c.Request.Context(), order)
	if err != nil {
		log.Printf("Service error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Order created successfully: %+v", createdOrder)
	c.JSON(http.StatusCreated, dto.OrderToResponse(createdOrder))
}

func (ctrl *Controller) GetAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	result, err := ctrl.orderService.GetAllOrders(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	orders, ok := result.Data.([]*core.Order)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unexpected data type"})
		return
	}

	response := dto.NewPaginatedResponse(
		dto.OrdersToListResponse(orders),
		result.Page,
		result.Limit,
		result.Total,
	)
	c.JSON(http.StatusOK, response)
}

func (ctrl *Controller) GetOrderById(c *gin.Context) {
	id := c.Param("id")
	order, err := ctrl.orderService.GetOrderById(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, dto.OrderToResponse(order))
}

func (ctrl *Controller) UpdateOrder(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order := &core.Order{
		Status:        req.Status,
		CustomerNotes: req.CustomerNotes,
		InternalNotes: req.InternalNotes,
	}

	updatedOrder, err := ctrl.orderService.UpdateOrder(c.Request.Context(), id, order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.OrderToResponse(updatedOrder))
}

func (ctrl *Controller) DeleteOrder(c *gin.Context) {
	id := c.Param("id")
	if err := ctrl.orderService.DeleteOrder(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Order deleted successfully"})
}
