package repository

import (
	"petpay/catalog-offers-service/internal/application/core"
	Out "petpay/catalog-offers-service/internal/application/ports/Out"

	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) Out.ProductRepositoryPort {
	return &ProductRepository{db: db}
}

func (p *ProductRepository) Save(product *core.Product) (*core.Product, error) {
	err := p.db.Create(product).Error
	if err != nil {
		return nil, err
	}
	return product, nil
}

func (p *ProductRepository) FindAll() ([]*core.Product, error) {
	products := make([]*core.Product, 0)
	err := p.db.Find(&products).Error
	if err != nil {
		return nil, err
	}
	return products, nil
}

func (p *ProductRepository) FindById(id uint) (*core.Product, error) {
	var product core.Product
	err := p.db.First(&product, id).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (p *ProductRepository) FindByCategory(category string) ([]*core.Product, error) {
	products := make([]*core.Product, 0)
	err := p.db.Where("category = ?", category).Find(&products).Error
	if err != nil {
		return nil, err
	}
	return products, nil
}

func (p *ProductRepository) Update(id uint, product *core.Product) (*core.Product, error) {
	err := p.db.Model(&core.Product{}).Where("ID = ?", id).Updates(product).Error
	if err != nil {
		return nil, err
	}
	return product, nil
}

func (p *ProductRepository) Delete(id uint) error {
	err := p.db.Delete(&core.Product{}, id).Error
	if err != nil {
		return err
	}
	return nil
}
