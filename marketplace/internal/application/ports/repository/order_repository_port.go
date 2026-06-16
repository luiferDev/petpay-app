package repository

import (
	"context"
	"petpay/marketplace-service/internal/application/core"
)

type OrderRepository interface {
	Save(ctx context.Context, order *core.Order) (*core.Order, error)
	FindById(ctx context.Context, id string) (*core.Order, error)
	FindAll(ctx context.Context, offset int, limit int) ([]*core.Order, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, id string, order *core.Order) (*core.Order, error)
	Delete(ctx context.Context, id string) error
}