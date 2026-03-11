package http

import (
	"github.com/gin-gonic/gin"
)

func NewRouter(handler *BookingHandler) *gin.Engine {
	r := gin.Default()

	api := r.Group("/api/v1")
	{
		bookings := api.Group("/bookings")
		{
			bookings.POST("", handler.CreateBooking)
			bookings.GET("", handler.ListBookings)
			bookings.GET("/:id", handler.GetBooking)
			bookings.PUT("/:id/status", handler.UpdateBookingStatus)
			bookings.POST("/:id/cancel", handler.CancelBooking)
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "bookings",
		})
	})

	return r
}
