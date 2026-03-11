package domain

import (
	"database/sql/driver"
	"fmt"
)

type ServiceType string

const (
	ServiceTypeGrooming       ServiceType = "GROOMING"
	ServiceTypeVeterinary     ServiceType = "VETERINARY"
	ServiceTypeTraining       ServiceType = "TRAINING"
	ServiceTypeWalking        ServiceType = "WALKING"
	ServiceTypeDaycare        ServiceType = "DAYCARE"
	ServiceTypeBoarding       ServiceType = "BOARDING"
	ServiceTypePetSitting     ServiceType = "PET_SITTING"
	ServiceTypeTransportation ServiceType = "TRANSPORTATION"
)

func (st *ServiceType) Scan(value any) error {
	if value == nil {
		*st = ""
		return nil
	}

	switch v := value.(type) {
	case string:
		*st = ServiceType(v)
	case []byte:
		*st = ServiceType(v)
	default:
		return fmt.Errorf("cannot scan %T into ServiceType", value)
	}
	return nil
}

func (st ServiceType) Value() (driver.Value, error) {
	return string(st), nil
}
