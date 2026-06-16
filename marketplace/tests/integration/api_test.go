package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/dto"
	servicesPort "petpay/marketplace-service/internal/application/ports/services"
	infrahttp "petpay/marketplace-service/internal/infrastructure/http"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type MockOrderService struct {
	mock.Mock
}

func (m *MockOrderService) CreateOrder(ctx context.Context, order *core.Order) (*core.Order, error) {
	args := m.Called(ctx, order)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Order), args.Error(1)
}

func (m *MockOrderService) GetAllOrders(ctx context.Context, page int, limit int) (*core.PaginatedResult, error) {
	args := m.Called(ctx, page, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.PaginatedResult), args.Error(1)
}

func (m *MockOrderService) GetOrderById(ctx context.Context, id string) (*core.Order, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Order), args.Error(1)
}

func (m *MockOrderService) UpdateOrder(ctx context.Context, id string, order *core.Order) (*core.Order, error) {
	args := m.Called(ctx, id, order)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Order), args.Error(1)
}

func (m *MockOrderService) DeleteOrder(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func setupMarketplaceTestServer(mockService servicesPort.OrderService) *httptest.Server {
	gin.SetMode(gin.TestMode)
	controller := infrahttp.NewController(mockService)
	router := infrahttp.SetupRouter(controller)
	return httptest.NewServer(router)
}

func TestMarketplaceHealth(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	resp, err := http.Get(server.URL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.Code)

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "marketplace", body["service"])
}

func TestMarketplaceCreateOrder(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	reqBody := dto.CreateOrderRequest{
		CustomerId:     "cust-001",
		StoreProfileId: "store-001",
		Currency:       "USD",
		Items: []dto.CreateOrderItemDTO{
			{ProductId: "prod-001", Quantity: 2},
		},
	}

	expectedOrder := &core.Order{
		Model:          gorm.Model{ID: 1},
		CustomerId:     "cust-001",
		StoreProfileId: "store-001",
		Status:         core.StatusPending,
		Currency:       "USD",
	}

	mockService.On("CreateOrder", mock.Anything, mock.Anything).Return(expectedOrder, nil)

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/orders/", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var response dto.OrderResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, uint(1), response.ID)
	assert.Equal(t, "cust-001", response.CustomerId)

	mockService.AssertExpectations(t)
}

func TestMarketplaceCreateOrderValidationError(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	reqBody := map[string]any{
		"customerId": "cust-001",
	}

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/orders/", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestMarketplaceGetOrderById(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	expectedOrder := &core.Order{
		Model:      gorm.Model{ID: 1},
		CustomerId: "cust-001",
		Status:     core.StatusPending,
	}

	mockService.On("GetOrderById", mock.Anything, "1").Return(expectedOrder, nil)

	resp, err := http.Get(server.URL + "/api/v1/orders/1")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.OrderResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, uint(1), response.ID)
	assert.Equal(t, "cust-001", response.CustomerId)

	mockService.AssertExpectations(t)
}

func TestMarketplaceGetOrderByIdNotFound(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	mockService.On("GetOrderById", mock.Anything, "999999").Return(nil, assert.AnError)

	resp, err := http.Get(server.URL + "/api/v1/orders/999999")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	mockService.AssertExpectations(t)
}

func TestMarketplaceGetAllOrders(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	orders := []*core.Order{
		{Model: gorm.Model{ID: 1}, CustomerId: "cust-001"},
		{Model: gorm.Model{ID: 2}, CustomerId: "cust-002"},
	}

	paginatedResult := core.NewPaginatedResult(orders, 1, 20, 2)

	mockService.On("GetAllOrders", mock.Anything, 1, 20).Return(paginatedResult, nil)

	resp, err := http.Get(server.URL + "/api/v1/orders/")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.PaginatedResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, 1, response.Page)
	assert.Equal(t, 20, response.Limit)
	assert.Equal(t, int64(2), response.Total)

	mockService.AssertExpectations(t)
}

func TestMarketplaceGetAllOrdersWithPagination(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	orders := []*core.Order{
		{Model: gorm.Model{ID: 1}, CustomerId: "cust-001"},
	}

	paginatedResult := core.NewPaginatedResult(orders, 2, 10, 1)

	mockService.On("GetAllOrders", mock.Anything, 2, 10).Return(paginatedResult, nil)

	resp, err := http.Get(server.URL + "/api/v1/orders/?page=2&limit=10")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.PaginatedResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, 2, response.Page)
	assert.Equal(t, 10, response.Limit)

	mockService.AssertExpectations(t)
}

func TestMarketplaceUpdateOrder(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	updatedOrder := &core.Order{
		Model:      gorm.Model{ID: 1},
		CustomerId: "cust-001",
		Status:     core.StatusConfirmed,
	}

	mockService.On("UpdateOrder", mock.Anything, "1", mock.Anything).Return(updatedOrder, nil)

	reqBody := map[string]any{
		"status": "CONFIRMED",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPut, server.URL+"/api/v1/orders/1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.OrderResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, core.StatusConfirmed, response.Status)

	mockService.AssertExpectations(t)
}

func TestMarketplaceDeleteOrder(t *testing.T) {
	mockService := new(MockOrderService)
	server := setupMarketplaceTestServer(mockService)
	defer server.Close()

	mockService.On("DeleteOrder", mock.Anything, "1").Return(nil)

	req, _ := http.NewRequest(http.MethodDelete, server.URL+"/api/v1/orders/1", nil)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "Order deleted successfully", body["message"])

	mockService.AssertExpectations(t)
}

func TestMarketplaceOrdersTableDriven(t *testing.T) {
	tests := []struct {
		name       string
		setupMock  func(*MockOrderService)
		method     string
		path       string
		body       any
		wantStatus int
	}{
		{
			name: "create order successfully",
			setupMock: func(m *MockOrderService) {
				m.On("CreateOrder", mock.Anything, mock.Anything).
					Return(&core.Order{Model: gorm.Model{ID: 1}, CustomerId: "cust-001", Status: core.StatusPending}, nil)
			},
			method:     http.MethodPost,
			path:       "/api/v1/orders/",
			body:       dto.CreateOrderRequest{CustomerId: "cust-001", StoreProfileId: "store-001", Currency: "USD", Items: []dto.CreateOrderItemDTO{{ProductId: "p1", Quantity: 1}}},
			wantStatus: http.StatusCreated,
		},
		{
			name: "get order by id",
			setupMock: func(m *MockOrderService) {
				m.On("GetOrderById", mock.Anything, "1").
					Return(&core.Order{Model: gorm.Model{ID: 1}, CustomerId: "cust-001"}, nil)
			},
			method:     http.MethodGet,
			path:       "/api/v1/orders/1",
			wantStatus: http.StatusOK,
		},
		{
			name: "order not found returns 404",
			setupMock: func(m *MockOrderService) {
				m.On("GetOrderById", mock.Anything, "999").Return(nil, assert.AnError)
			},
			method:     http.MethodGet,
			path:       "/api/v1/orders/999",
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockOrderService)
			tt.setupMock(mockService)
			server := setupMarketplaceTestServer(mockService)
			defer server.Close()

			var req *http.Request
			if tt.body != nil {
				body, _ := json.Marshal(tt.body)
				req, _ = http.NewRequest(tt.method, server.URL+tt.path, bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, _ = http.NewRequest(tt.method, server.URL+tt.path, nil)
			}

			resp, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			mockService.AssertExpectations(t)
		})
	}
}
