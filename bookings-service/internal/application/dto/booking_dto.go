package dto

import (
	"encoding/json"
	"time"

	"petpay/bookings-service/internal/domain"
)

// --- Request DTOs ---

type CreateBookingRequest struct {
	CustomerID      string          `json:"customerId" binding:"required"`
	CustomerEmail   string          `json:"customerEmail"`
	ProviderID      string          `json:"providerId" binding:"required"`
	PetID           string          `json:"petId" binding:"required"`
	ServiceType     string          `json:"serviceType" binding:"required"`
	ScheduledStart  string          `json:"scheduledStart" binding:"required"`
	ScheduledEnd    string          `json:"scheduledEnd" binding:"required"`
	DurationMinutes int             `json:"durationMinutes"`
	Price           float64         `json:"price"`
	Currency        string          `json:"currency"`
	Notes           string          `json:"notes"`
	CustomerNotes   string          `json:"customerNotes"`
	AddressID       string          `json:"addressId"`
	Address         json.RawMessage `json:"address"`
	PetDetails      json.RawMessage `json:"petDetails"`
	ProviderDetails json.RawMessage `json:"providerDetails"`
}

type UpdateStatusRequest struct {
	Status        string `json:"status" binding:"required"`
	CustomerEmail string `json:"customerEmail"`
}

type CancelBookingRequest struct {
	Reason        string `json:"reason" binding:"required"`
	CustomerEmail string `json:"customerEmail"`
}

// --- Response DTOs ---

type BookingResponse struct {
	ID                 uint                 `json:"id"`
	CustomerID         string               `json:"customerId"`
	ProviderID         string               `json:"providerId"`
	PetID              string               `json:"petId"`
	ServiceType        string               `json:"serviceType"`
	Status             string               `json:"status"`
	ScheduledStart     string               `json:"scheduledStart"`
	ScheduledEnd       string               `json:"scheduledEnd"`
	ActualStart        *string              `json:"actualStart"`
	ActualEnd          *string              `json:"actualEnd"`
	DurationMinutes    int                  `json:"durationMinutes"`
	Price              float64              `json:"price"`
	Currency           string               `json:"currency"`
	Notes              string               `json:"notes"`
	CustomerNotes      string               `json:"customerNotes"`
	ProviderNotes      string               `json:"providerNotes"`
	CancellationReason string               `json:"cancellationReason"`
	AddressID          string               `json:"addressId"`
	Address            json.RawMessage      `json:"address"`
	PetDetails         json.RawMessage      `json:"petDetails"`
	ProviderDetails    json.RawMessage      `json:"providerDetails"`
	Metadata           json.RawMessage      `json:"metadata"`
	CreatedAt          string               `json:"createdAt"`
	UpdatedAt          string               `json:"updatedAt"`
}

// --- Mappers ---

func CreateRequestToBooking(req *CreateBookingRequest) *domain.Booking {
	startTime, _ := time.Parse(time.RFC3339, req.ScheduledStart)
	endTime, _ := time.Parse(time.RFC3339, req.ScheduledEnd)

	return &domain.Booking{
		CustomerID:      req.CustomerID,
		ProviderID:      req.ProviderID,
		PetID:           req.PetID,
		ServiceType:     domain.ServiceType(req.ServiceType),
		Status:          domain.BookingStatusPending,
		ScheduledStart:  startTime,
		ScheduledEnd:    endTime,
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
}

func BookingToResponse(booking *domain.Booking) *BookingResponse {
	if booking == nil {
		return nil
	}

	var actualStart *string
	if booking.ActualStart != nil {
		s := booking.ActualStart.Format(time.RFC3339)
		actualStart = &s
	}
	var actualEnd *string
	if booking.ActualEnd != nil {
		s := booking.ActualEnd.Format(time.RFC3339)
		actualEnd = &s
	}

	return &BookingResponse{
		ID:                 booking.ID,
		CustomerID:         booking.CustomerID,
		ProviderID:         booking.ProviderID,
		PetID:              booking.PetID,
		ServiceType:        string(booking.ServiceType),
		Status:             string(booking.Status),
		ScheduledStart:     booking.ScheduledStart.Format(time.RFC3339),
		ScheduledEnd:       booking.ScheduledEnd.Format(time.RFC3339),
		ActualStart:        actualStart,
		ActualEnd:          actualEnd,
		DurationMinutes:    booking.DurationMinutes,
		Price:              booking.Price,
		Currency:           booking.Currency,
		Notes:              booking.Notes,
		CustomerNotes:      booking.CustomerNotes,
		ProviderNotes:      booking.ProviderNotes,
		CancellationReason: booking.CancellationReason,
		AddressID:          booking.AddressID,
		Address:            booking.Address,
		PetDetails:         booking.PetDetails,
		ProviderDetails:    booking.ProviderDetails,
		Metadata:           booking.Metadata,
		CreatedAt:          booking.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          booking.UpdatedAt.Format(time.RFC3339),
	}
}

func BookingsToListResponse(bookings []*domain.Booking) []*BookingResponse {
	result := make([]*BookingResponse, len(bookings))
	for i, b := range bookings {
		result[i] = BookingToResponse(b)
	}
	return result
}
