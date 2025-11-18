package core

import (
	"gorm.io/gorm"
)

type Product struct {
	gorm.Model
	StoreProfileId uint64   `json:"store_profile_id" gorm:"not null"`
	CategoryId     uint64   `json:"category_id" gorm:"not null;index"`
	Name           string   `json:"product_name" gorm:"size:255;not null"`
	Description    string   `json:"description" gorm:"type:text"`
	Brand          string   `json:"brand" gorm:"size:100 type: varchar(50)"`
	Price          float64  `json:"price" gorm:"type:decimal(15,2);not null"`
	DiscountPrice  float64  `json:"discount_price" gorm:"type:decimal(10,2);default:0"`
	StockQuantity  uint64   `json:"stock_quantity" gorm:"default:0"`
	Sku            string   `json:"sku" gorm:"size:100;uniqueIndex"`
	IsActive       bool     `json:"is_active" gorm:"default:true"`
	IsFeatured     bool     `json:"is_featured" gorm:"default:false"`
	ImageUrls      []string `json:"image_urls" gorm:"type:text[]"`
	Weight         float64  `json:"weight" gorm:"type:decimal(8,3)"`
	Dimensions     string   `json:"dimensions" gorm:"size:100; type: varchar(100)"`

	// Relaciones
	Category *ProductCategory `json:"category,omitempty" gorm:"foreignKey:CategoryId;references:ID"`
}
