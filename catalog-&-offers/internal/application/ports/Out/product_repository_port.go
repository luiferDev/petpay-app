package out

import (
	"context"
	"petpay/catalog-offers-service/internal/application/core"
)

type ProductRepositoryPort interface {
	Save(ctx context.Context, product *core.Product) (*core.Product, error)
	FindAll(ctx context.Context, offset int, limit int) ([]*core.Product, error)
	Count(ctx context.Context) (int64, error)
	FindById(ctx context.Context, id uint) (*core.Product, error)
	FindByCategory(ctx context.Context, categoryId uint64) ([]*core.Product, error)
	Update(ctx context.Context, id uint, product *core.Product) (*core.Product, error)
	Delete(ctx context.Context, id uint) error
}