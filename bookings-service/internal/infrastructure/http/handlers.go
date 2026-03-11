package http

import (
	"net/http"

	"petpay/bookings-service/internal/application"
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
	var req CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking := &domain.Booking{
		CustomerID:      req.CustomerID,
		ProviderID:      req.ProviderID,
		PetID:           req.PetID,
		ServiceType:     domain.ServiceType(req.ServiceType),
		ScheduledStart:  req.ScheduledStart,
		ScheduledEnd:    req.ScheduledEnd,
		DurationMinutes: req.DurationMinutes,
		Price:           req.Price,
		Currency:        req.Currency,
		Notes:           req.Notes,
		CustomerNotes:   req.CustomerNotes,
		AddressID:       req.AddressID,
		Address:         req.Address,
		PetDetails:      req.PetDetails,
		ProviderDetails: req.ProviderDetails,
	}

	created, err := h.service.CreateBooking(c.Request.Context(), booking, req.CustomerEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, created)
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

	c.JSON(http.StatusOK, booking)
}

func (h *BookingHandler) ListBookings(c *gin.Context) {
	filters := application.BookingFilters{
		CustomerID: c.Query("customerId"),
		ProviderID: c.Query("providerId"),
		PetID:      c.Query("petId"),
		Status:     domain.BookingStatus(c.Query("status")),
	}

	bookings, err := h.service.ListBookings(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, bookings)
}

func (h *BookingHandler) UpdateBookingStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdateStatusRequest
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

	c.JSON(http.StatusOK, updated)
}

func (h *BookingHandler) CancelBooking(c *gin.Context) {
	id := c.Param("id")

	var req CancelBookingRequest
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

	c.JSON(http.StatusOK, booking)
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

	c.JSON(http.StatusOK, booking)
}
