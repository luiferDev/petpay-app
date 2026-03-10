package core

import (
	"gorm.io/gorm"
)

type ServiceOffering struct {
	gorm.Model
	ServiceProviderId  uint64      `json:"service_provider_id" gorm:"not null;index"`
	ServiceType        ServiceType `json:"service_type" gorm:"type:varchar(50);not null"`
	Name               string      `json:"name" gorm:"size:255;not null"`
	Description        string      `json:"description" gorm:"type:text"`
	BasePrice          float64     `json:"base_price" gorm:"type:decimal(10,2);not null"`
	UnitPrice          float64     `json:"unit_price" gorm:"type:decimal(10,2);default:0"`
	DurationInMinutes  int         `json:"duration_in_minutes" gorm:"default:0"`
	IsActive           bool        `json:"is_active" gorm:"default:true"`
	TermsAndConditions string      `json:"terms_and_conditions" gorm:"type:text"`
}
