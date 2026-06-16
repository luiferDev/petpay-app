package dto

import (
	"petpay/marketplace-service/internal/application/core"
)

// --- Request DTOs ---

type CreateOrderRequest struct {
	CustomerId        string             `json:"customerId" binding:"required"`
	StoreProfileId    string             `json:"storeProfileId" binding:"required"`
	ShippingAddressId string             `json:"shippingAddressId"`
	BillingAddressId  string             `json:"billingAddressId"`
	CustomerNotes     string             `json:"customerNotes"`
	Currency          string             `json:"currency" binding:"required,len=3"`
	Items             []CreateOrderItemDTO `json:"items" binding:"required,min=1"`
}

type CreateOrderItemDTO struct {
	ProductId string `json:"productId" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

type UpdateOrderRequest struct {
	Status        core.OrderStatus `json:"status"`
	CustomerNotes string           `json:"customerNotes"`
	InternalNotes string           `json:"internalNotes"`
}

// --- Response DTOs ---

type OrderResponse struct {
	ID                uint              `json:"id"`
	OrderNumber       uint64            `json:"orderNumber"`
	CustomerId        string            `json:"customerId"`
	StoreProfileId    string            `json:"storeProfileId"`
	Status            core.OrderStatus  `json:"status"`
	Subtotal          float64           `json:"subtotal"`
	ShippingCost      float64           `json:"shippingCost"`
	Tax               float64           `json:"tax"`
	Discount          float64           `json:"discount"`
	TotalAmount       float64           `json:"totalAmount"`
	Currency          string            `json:"currency"`
	ShippingAddressId string            `json:"shippingAddressId"`
	BillingAddressId  string            `json:"billingAddressId"`
	TrackingNumber    uint64            `json:"trackingNumber"`
	ShippingCarrier   string            `json:"shippingCarrier"`
	CustomerNotes     string            `json:"customerNotes"`
	InternalNotes     string            `json:"internalNotes"`
	Items             []OrderItemResponse `json:"items,omitempty"`
	CreatedAt         string            `json:"createdAt"`
	UpdatedAt         string            `json:"updatedAt"`
}

type OrderItemResponse struct {
	ProductId   string `json:"productId"`
	Quantity    int    `json:"quantity"`
	UnitPrice   string `json:"unitPrice"`
	TotalPrice  string `json:"totalPrice"`
	Currency    string `json:"currency"`
	ProductName string `json:"productName"`
	ProductSKU  string `json:"productSku"`
}

// --- Mappers ---

func CreateRequestToOrder(req *CreateOrderRequest) *core.Order {
	items := make([]core.OrderItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = core.OrderItem{
			ProductId: item.ProductId,
			Quantity:  item.Quantity,
		}
	}
	return &core.Order{
		CustomerId:        req.CustomerId,
		StoreProfileId:    req.StoreProfileId,
		ShippingAddressId: req.ShippingAddressId,
		BillingAddressId:  req.BillingAddressId,
		CustomerNotes:     req.CustomerNotes,
		Currency:          req.Currency,
		Items:             items,
		Status:            core.StatusPending,
	}
}

func OrderToResponse(order *core.Order) *OrderResponse {
	if order == nil {
		return nil
	}

	items := make([]OrderItemResponse, len(order.Items))
	for i, item := range order.Items {
		items[i] = OrderItemResponse{
			ProductId:   item.ProductId,
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
			TotalPrice:  item.TotalPrice,
			Currency:    item.Currency,
			ProductName: item.ProductName,
			ProductSKU:  item.ProductSKU,
		}
	}

	return &OrderResponse{
		ID:                order.ID,
		OrderNumber:       order.OrderNumber,
		CustomerId:        order.CustomerId,
		StoreProfileId:    order.StoreProfileId,
		Status:            order.Status,
		Subtotal:          order.Subtotal,
		ShippingCost:      order.ShippingCost,
		Tax:               order.Tax,
		Discount:          order.Discount,
		TotalAmount:       order.TotalAmount,
		Currency:          order.Currency,
		ShippingAddressId: order.ShippingAddressId,
		BillingAddressId:  order.BillingAddressId,
		TrackingNumber:    order.TrackingNumber,
		ShippingCarrier:   order.ShippingCarrier,
		CustomerNotes:     order.CustomerNotes,
		InternalNotes:     order.InternalNotes,
		Items:             items,
		CreatedAt:         order.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         order.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func OrdersToListResponse(orders []*core.Order) []*OrderResponse {
	result := make([]*OrderResponse, len(orders))
	for i, order := range orders {
		result[i] = OrderToResponse(order)
	}
	return result
}
