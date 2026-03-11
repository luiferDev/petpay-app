package domain

import (
	"database/sql/driver"
	"fmt"
)

type BookingStatus string

const (
	BookingStatusPending    BookingStatus = "PENDING"
	BookingStatusConfirmed  BookingStatus = "CONFIRMED"
	BookingStatusInProgress BookingStatus = "IN_PROGRESS"
	BookingStatusCompleted  BookingStatus = "COMPLETED"
	BookingStatusCancelled  BookingStatus = "CANCELLED"
	BookingStatusNoShow     BookingStatus = "NO_SHOW"
	BookingStatusRefunded   BookingStatus = "REFUNDED"
)

func (bs *BookingStatus) Scan(value any) error {
	if value == nil {
		*bs = ""
		return nil
	}

	switch v := value.(type) {
	case string:
		*bs = BookingStatus(v)
	case []byte:
		*bs = BookingStatus(v)
	default:
		return fmt.Errorf("cannot scan %T into BookingStatus", value)
	}
	return nil
}

func (bs BookingStatus) Value() (driver.Value, error) {
	return string(bs), nil
}
