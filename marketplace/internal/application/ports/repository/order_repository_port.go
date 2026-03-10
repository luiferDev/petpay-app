package repository

import "petpay/marketplace-service/internal/application/core"

type OrderRepository interface {
	Save(order *core.Order) (*core.Order, error)
	FindById(id string) (*core.Order, error)
	FindAll() ([]*core.Order, error)
	Update(id string, order *core.Order) (*core.Order, error)
	Delete(id string) error
}