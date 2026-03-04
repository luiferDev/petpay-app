package http

import (
	"github.com/gin-gonic/gin"
)

func SetupRouter(controller *Controller) *gin.Engine {
	r := gin.Default()
	api := r.Group("/api/v1")
	{
		api.GET("/products/:id", controller.GetOneById)
		api.GET("/products/all", controller.GetAll)
		api.GET("/products", controller.FindAllByCategory)
		api.POST("/products", controller.Create)
		api.PATCH("/products/:id", controller.Update)
		api.DELETE("/products/:id", controller.Delete)
	}

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "catalog",
		})
	})

	return r
}
