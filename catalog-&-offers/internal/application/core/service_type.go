package core

import "database/sql/driver"

type ServiceType string

const (
	PetSitting     ServiceType = "PET_SITTING"
	PetBoarding    ServiceType = "PET_BOARDING"
	PetTransport   ServiceType = "PET_TRANSPORT"
	VeterinaryCare ServiceType = "VETERINARY_CARE"
	PetGrooming    ServiceType = "PET_GROOMING"
	PetWalking     ServiceType = "PET_WALKING"
	PetTraining    ServiceType = "PET_TRAINING"
	PetDayCare     ServiceType = "PET_DAYCARE"
	EmergencyCare  ServiceType = "EMERGENCY_CARE"
)

func (os *ServiceType) Scan(value any) error {
	if value == nil {
		*os = ""
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*os = ServiceType(v)
	case string:
		*os = ServiceType(v)
	default:
		return nil
	}

	return nil
}

func (os ServiceType) Value() (driver.Value, error) {
	return string(os), nil
}
