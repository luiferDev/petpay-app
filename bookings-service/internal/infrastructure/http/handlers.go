package http

import (
	"net/http"
	"strconv"

	"petpay/bookings-service/internal/application"
	"petpay/bookings-service/internal/application/dto"
	"petpay/bookings-service/internal/domain"

	"github.com/gin-gonic/gin"
)

type BookingHandler struct {
	service *application.BookingService
}

func NewBookingHandler(service *application.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var req dto.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking := dto.CreateRequestToBooking(&req)
	created, err := h.service.CreateBooking(c.Request.Context(), booking, req.CustomerEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.BookingToResponse(created))
}

func (h *BookingHandler) GetBooking(c *gin.Context) {
	id := c.Param("id")

	booking, err := h.service.GetBooking(c.Request.Context(), id)
	if err != nil {
		if err == application.ErrBookingNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.BookingToResponse(booking))
}

func (h *BookingHandler) GetBookingByID(c *gin.Context) {
	id := c.Param("id")

	booking, err := h.service.GetBooking(c.Request.Context(), id)
	if err != nil {
		if err == application.ErrBookingNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.BookingToResponse(booking))
}

func (h *BookingHandler) ListBookings(c *gin.Context) {
	filters := application.BookingFilters{
		CustomerID: c.Query("customerId"),
		ProviderID: c.Query("providerId"),
		PetID:      c.Query("petId"),
		Status:     domain.BookingStatus(c.Query("status")),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	bookings, err := h.service.ListBookings(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := dto.NewPaginatedResponse(
		dto.BookingsToListResponse(bookings),
		page, limit, int64(len(bookings)),
	)
	c.JSON(http.StatusOK, response)
}

func (h *BookingHandler) UpdateBookingStatus(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := domain.BookingStatus(req.Status)
	updated, err := h.service.UpdateBookingStatus(c.Request.Context(), id, status, req.CustomerEmail)
	if err != nil {
		if err == application.ErrBookingNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.BookingToResponse(updated))
}

func (h *BookingHandler) CancelBooking(c *gin.Context) {
	id := c.Param("id")

	var req dto.CancelBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking, err := h.service.CancelBooking(c.Request.Context(), id, req.Reason, req.CustomerEmail)
	if err != nil {
		if err == application.ErrBookingNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.BookingToResponse(booking))
}
