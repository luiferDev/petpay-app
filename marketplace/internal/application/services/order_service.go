package services

import (
	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/ports/repository"
	"petpay/marketplace-service/internal/application/ports/services"
)

type OrderServiceImpl struct {
	repo repository.OrderRepository
}

func NewOrderService(repo repository.OrderRepository) services.OrderService {
	return &OrderServiceImpl{repo: repo}
}

func (s *OrderServiceImpl) CreateOrder(order *core.Order) (*core.Order, error) {
	// Lógica de negocio aquí
	order.Status = core.StatusPending
	return s.repo.Save(order)
}

func (s *OrderServiceImpl) GetAllOrders() ([]*core.Order, error) {
	return s.repo.FindAll()
}

func (s *OrderServiceImpl) GetOrderById(id string) (*core.Order, error) {
	return s.repo.FindById(id)
}

func (s *OrderServiceImpl) UpdateOrder(id string, order *core.Order) (*core.Order, error) {
	return s.repo.Update(id, order)
}

func (s *OrderServiceImpl) DeleteOrder(id string) error {
	return s.repo.Delete(id)
}