package in

import (
	"petpay/catalog-offers-service/internal/application/core"
)

type ProductServicePort interface {
	CreateProduct(product *core.Product) (*core.Product, error)
	FindProductById(id uint) (*core.Product, error)
	FindAllProducts(page int, limit int) (*core.PaginatedResult, error)
	FindProductsByCategory(categoryId uint64) ([]*core.Product, error)
	UpdateProduct(id uint, product *core.Product) (*core.Product, error)
	DeleteProduct(id uint) error
}