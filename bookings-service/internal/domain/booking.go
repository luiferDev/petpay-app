package domain

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

type Booking struct {
	gorm.Model
	CustomerID         string          `gorm:"column:customer_id; index" json:"customerId"`
	ProviderID         string          `gorm:"column:provider_id; index" json:"providerId"`
	PetID              string          `gorm:"column:pet_id; index" json:"petId"`
	ServiceType        ServiceType     `gorm:"type:varchar(255); column:service_type" json:"serviceType"`
	Status             BookingStatus   `gorm:"type:varchar(255); default:'PENDING'; column:status" json:"status"`
	ScheduledStart     time.Time       `gorm:"column:scheduled_start" json:"scheduledStart"`
	ScheduledEnd       time.Time       `gorm:"column:scheduled_end" json:"scheduledEnd"`
	ActualStart        *time.Time      `gorm:"column:actual_start" json:"actualStart"`
	ActualEnd          *time.Time      `gorm:"column:actual_end" json:"actualEnd"`
	DurationMinutes    int             `gorm:"column:duration_minutes" json:"durationMinutes"`
	Price              float64         `gorm:"column:price" json:"price"`
	Currency           string          `gorm:"column:currency" json:"currency"`
	Notes              string          `gorm:"column:notes" json:"notes"`
	CustomerNotes      string          `gorm:"column:customer_notes" json:"customerNotes"`
	ProviderNotes      string          `gorm:"column:provider_notes" json:"providerNotes"`
	CancellationReason string          `gorm:"column:cancellation_reason" json:"cancellationReason"`
	AddressID          string          `gorm:"column:address_id; index" json:"addressId"`
	Address            json.RawMessage `gorm:"type:jsonb; column:address" json:"address"`
	PetDetails         json.RawMessage `gorm:"type:jsonb; column:pet_details" json:"petDetails"`
	ProviderDetails    json.RawMessage `gorm:"type:jsonb; column:provider_details" json:"providerDetails"`
	Metadata           json.RawMessage `gorm:"type:jsonb; column:metadata" json:"metadata"`
}

func (Booking) TableName() string {
	return "bookings"
}

func (b *Booking) BeforeSave(tx *gorm.DB) error {
	if b.Address == nil {
		b.Address = json.RawMessage("{}")
	}
	if b.PetDetails == nil {
		b.PetDetails = json.RawMessage("{}")
	}
	if b.ProviderDetails == nil {
		b.ProviderDetails = json.RawMessage("{}")
	}
	if b.Metadata == nil {
		b.Metadata = json.RawMessage("{}")
	}
	return nil
}
