package repository

import (
	"context"
	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/ports/repository"
	"gorm.io/gorm"
)

type PostgresOrderRepository struct {
	db *gorm.DB
}

func NewPostgresOrderRepository(db *gorm.DB) repository.OrderRepository {
	return &PostgresOrderRepository{db: db}
}

func (r *PostgresOrderRepository) Save(ctx context.Context, order *core.Order) (*core.Order, error) {
	if err := r.db.WithContext(ctx).Create(order).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func (r *PostgresOrderRepository) FindById(ctx context.Context, id string) (*core.Order, error) {
	var order core.Order
	if err := r.db.WithContext(ctx).First(&order, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *PostgresOrderRepository) FindAll(ctx context.Context, offset int, limit int) ([]*core.Order, error) {
	var orders []*core.Order
	if err := r.db.WithContext(ctx).Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *PostgresOrderRepository) Count(ctx context.Context) (int64, error) {
	var total int64
	if err := r.db.WithContext(ctx).Model(&core.Order{}).Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (r *PostgresOrderRepository) Update(ctx context.Context, id string, order *core.Order) (*core.Order, error) {
	if err := r.db.WithContext(ctx).Model(&core.Order{}).Where("id = ?", id).Updates(order).Error; err != nil {
		return nil, err
	}
	return r.FindById(ctx, id)
}

func (r *PostgresOrderRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&core.Order{}, "id = ?", id).Error
}