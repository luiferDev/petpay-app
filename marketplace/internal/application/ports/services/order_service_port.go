package services

import (
	"context"
	"petpay/marketplace-service/internal/application/core"
)

type OrderService interface {
	CreateOrder(ctx context.Context, order *core.Order) (*core.Order, error)
	GetAllOrders(ctx context.Context, page int, limit int) (*core.PaginatedResult, error)
	GetOrderById(ctx context.Context, id string) (*core.Order, error)
	UpdateOrder(ctx context.Context, id string, order *core.Order) (*core.Order, error)
	DeleteOrder(ctx context.Context, id string) error
}