package core

import "gorm.io/gorm"

type Order struct {
	gorm.Model
	OrderNumber uint64 `gorm:"column:order_number" json:"orderNumber"`
	CustomerId string `gorm:"column:customer_id; index" json:"customerId"`
	StoreProfileId string `gorm:"column:store_profile_id; index" json:"storeProfileId"`
	Status OrderStatus `gorm:"type:varchar(255); default:'PENDING'; column:status" json:"status"`
	Subtotal float64 `gorm:"column:subtotal" json:"subtotal"`
	ShippingCost float64 `gorm:"column:shipping_cost" json:"shippingCost"`
	Tax float64 `gorm:"column:tax" json:"tax"`
	Discount float64 `gorm:"column:discount" json:"discount"`
	TotalAmount float64 `gorm:"column:total_amount" json:"totalAmount"`
	Currency float64 `gorm:"column:currency" json:"currency"`
	ShippingAddressId string `gorm:"column:shipping_address_id; index" json:"shippingAddressId"`
	BillingAddressId string `gorm:"column:billing_address_id; index" json:"billingAddressId"`
	TrackingNumber uint64 `gorm:"column:tracking_number" json:"trackingNumber"`
	ShippingCarrier string `gorm:"column:shipping_carrier" json:"shippingCarrier"`
	CustomerNotes string `gorm:"column:customer_notes" json:"customerNotes"`
	InternalNotes string `gorm:"column:internal_notes" json:"internalNotes"`
	EstimatedDelivery string `gorm:"column:estimated_delivery" json:"estimatedDelivery"`
	ActualDelivery string `gorm:"column:actual_delivery" json:"actualDelivery"`
	Items []OrderItem `gorm:"foreignKey:OrderID"`
}