package http

import (
	"encoding/json"
	"time"

	"petpay/bookings-service/internal/domain"
)

type CreateBookingRequest struct {
	CustomerID      string          `json:"customerId" binding:"required"`
	CustomerEmail   string          `json:"customerEmail"`
	ProviderID      string          `json:"providerId" binding:"required"`
	PetID           string          `json:"petId" binding:"required"`
	ServiceType     string          `json:"serviceType" binding:"required"`
	ScheduledStart  time.Time       `json:"scheduledStart" binding:"required"`
	ScheduledEnd    time.Time       `json:"scheduledEnd" binding:"required"`
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

type BookingResponse struct {
	ID                 uint                 `json:"id"`
	CustomerID         string               `json:"customerId"`
	ProviderID         string               `json:"providerId"`
	PetID              string               `json:"petId"`
	ServiceType        domain.ServiceType   `json:"serviceType"`
	Status             domain.BookingStatus `json:"status"`
	ScheduledStart     time.Time            `json:"scheduledStart"`
	ScheduledEnd       time.Time            `json:"scheduledEnd"`
	ActualStart        *time.Time           `json:"actualStart"`
	ActualEnd          *time.Time           `json:"actualEnd"`
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
	CreatedAt          time.Time            `json:"createdAt"`
	UpdatedAt          time.Time            `json:"updatedAt"`
}
