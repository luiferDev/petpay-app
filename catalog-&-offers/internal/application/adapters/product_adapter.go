package adapters

import (
	"petpay/catalog-offers-service/internal/application/core"
	Out "petpay/catalog-offers-service/internal/application/ports/Out"
	"petpay/catalog-offers-service/internal/application/ports/in"
)

type ProductAdapter struct {
	repo Out.ProductRepositoryPort
}

func NewProductAdapter(repo Out.ProductRepositoryPort) in.ProductServicePort {
	return &ProductAdapter{repo: repo}
}

func (p *ProductAdapter) CreateProduct(product *core.Product) (*core.Product, error) {
	return p.repo.Save(product)
}

func (p *ProductAdapter) FindProductById(id uint) (*core.Product, error) {
	return p.repo.FindById(id)
}

func (p *ProductAdapter) FindAllProducts() ([]*core.Product, error) {
	return p.repo.FindAll()
}

func (p *ProductAdapter) FindProductsByCategory(category string) ([]*core.Product, error) {
	return p.repo.FindByCategory(category)
}

func (p *ProductAdapter) UpdateProduct(id uint, product *core.Product) (*core.Product, error) {
	return p.repo.Update(id, product)
}

func (p *ProductAdapter) DeleteProduct(id uint) error {
	return p.repo.Delete(id)
}
