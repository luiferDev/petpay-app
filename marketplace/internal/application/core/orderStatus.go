package core

import (
	"database/sql/driver"
	"fmt"
)

// --- OrderStatus (Enumeración) ---

type OrderStatus string

// Constantes para la enumeración OrderStatus
const (
	StatusPending        OrderStatus = "PENDING"
	StatusConfirmed      OrderStatus = "CONFIRMED"
	StatusProcessing     OrderStatus = "PROCESSING"
	StatusReadyToShip    OrderStatus = "READY_TO_SHIP"
	StatusShipped        OrderStatus = "SHIPPED"
	StatusOutForDelivery OrderStatus = "OUT_FOR_DELIVERY"
	StatusDelivered      OrderStatus = "DELIVERED"
	StatusCancelled      OrderStatus = "CANCELLED"
	StatusRefunded       OrderStatus = "REFUNDED"
	StatusReturned       OrderStatus = "RETURNED"
)

// Implementación de interfaces para que GORM y SQL manejen el tipo personalizado OrderStatus
func (os *OrderStatus) Scan(value any) error {
	if value == nil {
		*os = ""
		return nil
	}
	
	switch v := value.(type) {
	case string:
		*os = OrderStatus(v)
	case []byte:
		*os = OrderStatus(v)
	default:
		return fmt.Errorf("cannot scan %T into OrderStatus", value)
	}
	return nil
}

func (os OrderStatus) Value() (driver.Value, error) {
	return string(os), nil
}