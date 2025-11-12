package adapters

import (
	"petpay/catalog-offers-service/internal/application/core"
	"petpay/catalog-offers-service/internal/application/ports/In"
	"petpay/catalog-offers-service/internal/infrastructure/repository"
)

type ProductAdapter struct {
	repo repository.ProductRepository
}

func NewProductAdapter(repo repository.ProductRepository) in.ProductServicePort {
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
