package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
	"petpay/marketplace-service/internal/application/core"
)

// Mock repository
type MockOrderRepository struct {
	mock.Mock
}

func (m *MockOrderRepository) Save(order *core.Order) (*core.Order, error) {
	args := m.Called(order)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Order), args.Error(1)
}

func (m *MockOrderRepository) FindById(id string) (*core.Order, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Order), args.Error(1)
}

func (m *MockOrderRepository) FindAll() ([]*core.Order, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*core.Order), args.Error(1)
}

func (m *MockOrderRepository) Update(id string, order *core.Order) (*core.Order, error) {
	args := m.Called(id, order)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Order), args.Error(1)
}

func (m *MockOrderRepository) Delete(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

// Tests
func TestCreateOrder(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	order := &core.Order{
		CustomerId:     "cust-123",
		StoreProfileId: "store-456",
		TotalAmount:    100.00,
	}

	// Expect Save to be called and return the order with ID
	mockRepo.On("Save", mock.AnythingOfType("*core.Order")).Return(order, nil)

	result, err := service.CreateOrder(order)

	assert.NoError(t, err)
	assert.Equal(t, core.StatusPending, result.Status)
	assert.Equal(t, "cust-123", result.CustomerId)
	mockRepo.AssertExpectations(t)
}

func TestGetOrderById(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	expectedOrder := &core.Order{
		Model:      gorm.Model{ID: 1},
		CustomerId: "cust-123",
		Status:     core.StatusPending,
	}

	mockRepo.On("FindById", "1").Return(expectedOrder, nil)

	result, err := service.GetOrderById("1")

	assert.NoError(t, err)
	assert.Equal(t, "cust-123", result.CustomerId)
	mockRepo.AssertExpectations(t)
}

func TestGetOrderByIdNotFound(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	mockRepo.On("FindById", "nonexistent").Return(nil, nil)

	result, err := service.GetOrderById("nonexistent")

	assert.NoError(t, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestGetAllOrders(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	orders := []*core.Order{
		{Model: gorm.Model{ID: 1}, CustomerId: "cust-1"},
		{Model: gorm.Model{ID: 2}, CustomerId: "cust-2"},
	}

	mockRepo.On("FindAll").Return(orders, nil)

	result, err := service.GetAllOrders()

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestUpdateOrder(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	order := &core.Order{
		Model:      gorm.Model{ID: 1},
		CustomerId: "cust-123",
		Status:     core.StatusConfirmed,
	}

	mockRepo.On("Update", "1", mock.AnythingOfType("*core.Order")).Return(order, nil)

	result, err := service.UpdateOrder("1", order)

	assert.NoError(t, err)
	assert.Equal(t, core.StatusConfirmed, result.Status)
	mockRepo.AssertExpectations(t)
}

func TestDeleteOrder(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	mockRepo.On("Delete", "1").Return(nil)

	err := service.DeleteOrder("1")

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestCreateOrderSetsPendingStatus(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	service := NewOrderService(mockRepo)

	order := &core.Order{
		CustomerId:     "cust-123",
		StoreProfileId: "store-456",
		Status:         core.StatusShipped, // Try to set different status
		TotalAmount:    100.00,
	}

	// Capture the order passed to Save
	mockRepo.On("Save", mock.MatchedBy(func(o *core.Order) bool {
		return o.Status == core.StatusPending // Should be forced to pending
	})).Return(order, nil)

	result, err := service.CreateOrder(order)

	assert.NoError(t, err)
	assert.Equal(t, core.StatusPending, result.Status)
	mockRepo.AssertExpectations(t)
}
