package adapters

import (
	"context"
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
	return p.repo.Save(context.Background(), product)
}

func (p *ProductAdapter) FindProductById(id uint) (*core.Product, error) {
	return p.repo.FindById(context.Background(), id)
}

func (p *ProductAdapter) FindAllProducts(page int, limit int) (*core.PaginatedResult, error) {
	offset := (page - 1) * limit
	products, err := p.repo.FindAll(context.Background(), offset, limit)
	if err != nil {
		return nil, err
	}
	total, err := p.repo.Count(context.Background())
	if err != nil {
		return nil, err
	}
	return core.NewPaginatedResult(products, page, limit, total), nil
}

func (p *ProductAdapter) FindProductsByCategory(categoryId uint64) ([]*core.Product, error) {
	return p.repo.FindByCategory(context.Background(), categoryId)
}

func (p *ProductAdapter) UpdateProduct(id uint, product *core.Product) (*core.Product, error) {
	return p.repo.Update(context.Background(), id, product)
}

func (p *ProductAdapter) DeleteProduct(id uint) error {
	return p.repo.Delete(context.Background(), id)
}
