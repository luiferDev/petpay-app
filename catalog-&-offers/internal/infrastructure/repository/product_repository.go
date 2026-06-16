package repository

import (
	"context"
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

func (p *ProductRepository) Save(ctx context.Context, product *core.Product) (*core.Product, error) {
	err := p.db.WithContext(ctx).Create(product).Error
	if err != nil {
		return nil, err
	}
	return product, nil
}

func (p *ProductRepository) FindAll(ctx context.Context, offset int, limit int) ([]*core.Product, error) {
	products := make([]*core.Product, 0)
	err := p.db.WithContext(ctx).Offset(offset).Limit(limit).Find(&products).Error
	if err != nil {
		return nil, err
	}
	return products, nil
}

func (p *ProductRepository) Count(ctx context.Context) (int64, error) {
	var total int64
	err := p.db.WithContext(ctx).Model(&core.Product{}).Count(&total).Error
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (p *ProductRepository) FindById(ctx context.Context, id uint) (*core.Product, error) {
	var product core.Product
	err := p.db.WithContext(ctx).First(&product, id).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (p *ProductRepository) FindByCategory(ctx context.Context, categoryId uint64) ([]*core.Product, error) {
	products := make([]*core.Product, 0)
	err := p.db.WithContext(ctx).Where("category_id = ?", categoryId).Find(&products).Error
	if err != nil {
		return nil, err
	}
	return products, nil
}

func (p *ProductRepository) Update(ctx context.Context, id uint, product *core.Product) (*core.Product, error) {
	err := p.db.WithContext(ctx).Model(&core.Product{}).Where("ID = ?", id).Updates(product).Error
	if err != nil {
		return nil, err
	}
	return product, nil
}

func (p *ProductRepository) Delete(ctx context.Context, id uint) error {
	err := p.db.WithContext(ctx).Delete(&core.Product{}, id).Error
	if err != nil {
		return err
	}
	return nil
}
