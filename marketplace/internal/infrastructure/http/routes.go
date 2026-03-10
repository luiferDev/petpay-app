package http

import (
	"github.com/gin-gonic/gin"
)

func SetupRouter(controller *Controller) *gin.Engine {
	r := gin.Default()
	api := r.Group("/api/v1")
	{
		orders := api.Group("/orders")
		{
			orders.POST("/", controller.CreateOrder)
			orders.GET("/", controller.GetAllOrders)
			orders.GET("/:id", controller.GetOrderById)
			orders.PUT("/:id", controller.UpdateOrder)
			orders.DELETE("/:id", controller.DeleteOrder)
		}
	}

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "marketplace",
		})
	})

	return r
}
