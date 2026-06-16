package services

import (
	"context"
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

func (s *OrderServiceImpl) CreateOrder(ctx context.Context, order *core.Order) (*core.Order, error) {
	// Lógica de negocio aquí
	order.Status = core.StatusPending
	return s.repo.Save(ctx, order)
}

func (s *OrderServiceImpl) GetAllOrders(ctx context.Context, page int, limit int) (*core.PaginatedResult, error) {
	offset := (page - 1) * limit
	orders, err := s.repo.FindAll(ctx, offset, limit)
	if err != nil {
		return nil, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, err
	}
	return core.NewPaginatedResult(orders, page, limit, total), nil
}

func (s *OrderServiceImpl) GetOrderById(ctx context.Context, id string) (*core.Order, error) {
	return s.repo.FindById(ctx, id)
}

func (s *OrderServiceImpl) UpdateOrder(ctx context.Context, id string, order *core.Order) (*core.Order, error) {
	return s.repo.Update(ctx, id, order)
}

func (s *OrderServiceImpl) DeleteOrder(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}