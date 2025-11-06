package services

import "petpay/marketplace-service/internal/application/core"

type OrderService interface {
	CreateOrder(order *core.Order) (*core.Order, error)
	GetAllOrders() ([]*core.Order, error)
	GetOrderById(id string) (*core.Order, error)
	UpdateOrder(id string, order *core.Order) (*core.Order, error)
	DeleteOrder(id string) error
}