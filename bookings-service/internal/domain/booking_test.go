package domain

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBooking_TableName(t *testing.T) {
	b := &Booking{}
	assert.Equal(t, "bookings", b.TableName())
}

func TestBooking_BeforeSave(t *testing.T) {
	tests := []struct {
		name           string
		initialAddress json.RawMessage
		initialPet     json.RawMessage
		initialMeta    json.RawMessage
		expectEmpty    bool
	}{
		{
			name:           "nil values should be initialized",
			initialAddress: nil,
			initialPet:     nil,
			initialMeta:    nil,
			expectEmpty:    true,
		},
		{
			name:           "non-nil values should be preserved",
			initialAddress: json.RawMessage(`{"street": "123 Main St"}`),
			initialPet:     json.RawMessage(`{"name": "Buddy"}`),
			initialMeta:    json.RawMessage(`{"source": "web"}`),
			expectEmpty:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b := &Booking{
				Address:         tt.initialAddress,
				PetDetails:      tt.initialPet,
				ProviderDetails: tt.initialPet,
				Metadata:        tt.initialMeta,
			}

			err := b.BeforeSave(nil)
			assert.NoError(t, err)

			if tt.expectEmpty {
				assert.Equal(t, json.RawMessage("{}"), b.Address)
				assert.Equal(t, json.RawMessage("{}"), b.PetDetails)
				assert.Equal(t, json.RawMessage("{}"), b.ProviderDetails)
				assert.Equal(t, json.RawMessage("{}"), b.Metadata)
			} else {
				assert.Equal(t, tt.initialAddress, b.Address)
				assert.Equal(t, tt.initialPet, b.PetDetails)
			}
		})
	}
}

func TestBooking_Fields(t *testing.T) {
	startTime := time.Now()
	endTime := startTime.Add(1 * time.Hour)

	booking := &Booking{
		CustomerID:         "cust-123",
		ProviderID:         "prov-456",
		PetID:              "pet-789",
		ServiceType:        ServiceTypeGrooming,
		Status:             BookingStatusPending,
		ScheduledStart:     startTime,
		ScheduledEnd:       endTime,
		DurationMinutes:    60,
		Price:              50.00,
		Currency:           "USD",
		Notes:              "Test booking",
		CustomerNotes:      "Please be gentle",
		ProviderNotes:      "Pet is friendly",
		CancellationReason: "",
		AddressID:          "addr-123",
	}

	assert.Equal(t, "cust-123", booking.CustomerID)
	assert.Equal(t, "prov-456", booking.ProviderID)
	assert.Equal(t, "pet-789", booking.PetID)
	assert.Equal(t, ServiceTypeGrooming, booking.ServiceType)
	assert.Equal(t, BookingStatusPending, booking.Status)
	assert.Equal(t, startTime, booking.ScheduledStart)
	assert.Equal(t, endTime, booking.ScheduledEnd)
	assert.Equal(t, 60, booking.DurationMinutes)
	assert.Equal(t, 50.00, booking.Price)
	assert.Equal(t, "USD", booking.Currency)
	assert.Equal(t, "Test booking", booking.Notes)
	assert.Equal(t, "Please be gentle", booking.CustomerNotes)
	assert.Equal(t, "Pet is friendly", booking.ProviderNotes)
	assert.Equal(t, "addr-123", booking.AddressID)
}

func TestBooking_ActualTimes(t *testing.T) {
	booking := &Booking{}

	assert.Nil(t, booking.ActualStart)
	assert.Nil(t, booking.ActualEnd)

	now := time.Now()
	booking.ActualStart = &now
	booking.ActualEnd = func() *time.Time { t := now.Add(1 * time.Hour); return &t }()

	assert.NotNil(t, booking.ActualStart)
	assert.NotNil(t, booking.ActualEnd)
}
