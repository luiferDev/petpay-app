package repository

import (
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

func (r *PostgresOrderRepository) Save(order *core.Order) (*core.Order, error) {
	if err := r.db.Create(order).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func (r *PostgresOrderRepository) FindById(id string) (*core.Order, error) {
	var order core.Order
	if err := r.db.First(&order, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *PostgresOrderRepository) FindAll() ([]*core.Order, error) {
	var orders []*core.Order
	if err := r.db.Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *PostgresOrderRepository) Update(id string, order *core.Order) (*core.Order, error) {
	if err := r.db.Model(&core.Order{}).Where("id = ?", id).Updates(order).Error; err != nil {
		return nil, err
	}
	return r.FindById(id)
}

func (r *PostgresOrderRepository) Delete(id string) error {
	return r.db.Delete(&core.Order{}, "id = ?", id).Error
}