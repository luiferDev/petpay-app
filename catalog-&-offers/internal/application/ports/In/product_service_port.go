package in

import "petpay/catalog-offers-service/internal/application/core"

type ProductServicePort interface {
	CreateProduct(product *core.Product) (*core.Product, error)
	FindProductById(id uint) (*core.Product, error)
	FindAllProducts() ([]*core.Product, error)
	FindProductsByCategory(category string) ([]*core.Product, error)
	UpdateProduct(id uint, product *core.Product) (*core.Product, error)
	DeleteProduct(id uint) error
}