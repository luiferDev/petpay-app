package core

import (
	"gorm.io/gorm"
)

type ProductCategory struct {
	gorm.Model
	Name         string  `json:"name" gorm:"size:255;not null"`
	Description  string  `json:"description" gorm:"type:text"`
	Slug         string  `json:"slug" gorm:"size:255;uniqueIndex;not null"`
	ParentID     *uint64 `json:"parent_id,omitempty" gorm:"index"`
	DisplayOrder int     `json:"display_order" gorm:"default:0"`
	IsActive     bool    `json:"is_active" gorm:"default:true"`
	IconUrl      string  `json:"icon_url" gorm:"size:500"`
	BannerUrl    string  `json:"banner_url" gorm:"size:500"`

	// Relaciones
	Parent   *ProductCategory   `json:"parent,omitempty" gorm:"foreignKey:ParentID;references:ID"`
	Children []ProductCategory  `json:"children,omitempty" gorm:"foreignKey:ParentID;references:ID"`
	Products []Product          `json:"products,omitempty" gorm:"foreignKey:CategoryId;references:ID"`
}
