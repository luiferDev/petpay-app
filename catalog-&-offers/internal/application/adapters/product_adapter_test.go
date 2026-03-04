package adapters

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
	"petpay/catalog-offers-service/internal/application/core"
)

// Mock repository
type MockProductRepository struct {
	mock.Mock
}

func (m *MockProductRepository) Save(product *core.Product) (*core.Product, error) {
	args := m.Called(product)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Product), args.Error(1)
}

func (m *MockProductRepository) FindById(id uint) (*core.Product, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Product), args.Error(1)
}

func (m *MockProductRepository) FindAll() ([]*core.Product, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*core.Product), args.Error(1)
}

func (m *MockProductRepository) Update(id uint, product *core.Product) (*core.Product, error) {
	args := m.Called(id, product)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Product), args.Error(1)
}

func (m *MockProductRepository) Delete(id uint) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockProductRepository) FindByCategory(category string) ([]*core.Product, error) {
	args := m.Called(category)
	return args.Get(0).([]*core.Product), args.Error(1)
}

// Tests
func TestCreateProduct(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	product := &core.Product{
		Name:          "Test Product",
		Description:   "Test Description",
		Price:         99.99,
		StockQuantity: 10,
		Sku:           "TEST-001",
		IsActive:      true,
	}

	mockRepo.On("Save", mock.AnythingOfType("*core.Product")).Return(product, nil)

	result, err := adapter.CreateProduct(product)

	assert.NoError(t, err)
	assert.Equal(t, "Test Product", result.Name)
	mockRepo.AssertExpectations(t)
}

func TestFindProductById(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	expectedProduct := &core.Product{
		Model:    gorm.Model{ID: 1},
		Name:     "Test Product",
		Price:    99.99,
		Sku:      "TEST-001",
		IsActive: true,
	}

	mockRepo.On("FindById", uint(1)).Return(expectedProduct, nil)

	result, err := adapter.FindProductById(1)

	assert.NoError(t, err)
	assert.Equal(t, "Test Product", result.Name)
	mockRepo.AssertExpectations(t)
}

func TestFindProductByIdNotFound(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	mockRepo.On("FindById", uint(999)).Return(nil, nil)

	result, err := adapter.FindProductById(999)

	assert.NoError(t, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestFindAllProducts(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	products := []*core.Product{
		{Model: gorm.Model{ID: 1}, Name: "Product 1", Price: 10.00},
		{Model: gorm.Model{ID: 2}, Name: "Product 2", Price: 20.00},
	}

	mockRepo.On("FindAll").Return(products, nil)

	result, err := adapter.FindAllProducts()

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestUpdateProduct(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	product := &core.Product{
		Model:    gorm.Model{ID: 1},
		Name:     "Updated Product",
		Price:    79.99,
		IsActive: true,
	}

	mockRepo.On("Update", uint(1), mock.AnythingOfType("*core.Product")).Return(product, nil)

	result, err := adapter.UpdateProduct(1, product)

	assert.NoError(t, err)
	assert.Equal(t, "Updated Product", result.Name)
	mockRepo.AssertExpectations(t)
}

func TestDeleteProduct(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	mockRepo.On("Delete", uint(1)).Return(nil)

	err := adapter.DeleteProduct(1)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestFindProductsByCategory(t *testing.T) {
	mockRepo := new(MockProductRepository)
	adapter := NewProductAdapter(mockRepo)

	products := []*core.Product{
		{Model: gorm.Model{ID: 1}, Name: "Product 1", CategoryId: 1},
		{Model: gorm.Model{ID: 2}, Name: "Product 2", CategoryId: 1},
	}

	mockRepo.On("FindByCategory", "electronics").Return(products, nil)

	result, err := adapter.FindProductsByCategory("electronics")

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}
