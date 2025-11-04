package model

import "gorm.io/gorm"

type OrderItem struct {
	gorm.Model
	OrderId       string `gorm:"column:order_id; index" json:"orderId"`
	ProductId     string `gorm:"column:product_id; index" json:"productId"`
	Quantity      int    `gorm:"column:quantity" json:"quantity"`
	UnitPrice     string `gorm:"column:unit_price" json:"unitPrice"`
	TotalPrice    string `gorm:"column:total_price" json:"totalPrice"`
	Currency      string `gorm:"column:currency" json:"currency"`
	ProductName   string `gorm:"column:product_name" json:"productName"`
	ProductSKU    string `gorm:"column:product_sku" json:"productSku"`
	ProductImage  string `gorm:"column:product_image" json:"productImage"`
}