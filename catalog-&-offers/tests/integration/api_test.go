package integration_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"petpay/catalog-offers-service/internal/application/core"
	"petpay/catalog-offers-service/internal/application/dto"
	"petpay/catalog-offers-service/internal/application/ports/in"
	cataloghttp "petpay/catalog-offers-service/internal/infrastructure/http"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type MockProductService struct {
	mock.Mock
}

func (m *MockProductService) CreateProduct(product *core.Product) (*core.Product, error) {
	args := m.Called(product)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Product), args.Error(1)
}

func (m *MockProductService) FindProductById(id uint) (*core.Product, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Product), args.Error(1)
}

func (m *MockProductService) FindAllProducts(page int, limit int) (*core.PaginatedResult, error) {
	args := m.Called(page, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.PaginatedResult), args.Error(1)
}

func (m *MockProductService) FindProductsByCategory(categoryId uint64) ([]*core.Product, error) {
	args := m.Called(categoryId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*core.Product), args.Error(1)
}

func (m *MockProductService) UpdateProduct(id uint, product *core.Product) (*core.Product, error) {
	args := m.Called(id, product)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Product), args.Error(1)
}

func (m *MockProductService) DeleteProduct(id uint) error {
	args := m.Called(id)
	return args.Error(0)
}

func setupCatalogTestServer(mockService in.ProductServicePort) *httptest.Server {
	gin.SetMode(gin.TestMode)
	controller := cataloghttp.NewController(mockService)
	router := cataloghttp.SetupRouter(controller)
	return httptest.NewServer(router)
}

func TestCatalogHealth(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	resp, err := http.Get(server.URL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "catalog", body["service"])
}

func TestCatalogCreateProduct(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	reqBody := dto.CreateProductRequest{
		StoreProfileId: 1,
		CategoryId:     1,
		Name:           "Test Product",
		Price:          99.99,
		StockQuantity:  10,
		Sku:            "TEST-001",
	}

	expectedProduct := &core.Product{
		Model:          gorm.Model{ID: 1},
		StoreProfileId: 1,
		CategoryId:     1,
		Name:           "Test Product",
		Price:          99.99,
		StockQuantity:  10,
		Sku:            "TEST-001",
		IsActive:       true,
		IsFeatured:     false,
	}

	mockService.On("CreateProduct", mock.Anything).Return(expectedProduct, nil)

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/products", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var response dto.ProductResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, uint(1), response.ID)
	assert.Equal(t, "Test Product", response.Name)
	assert.Equal(t, 99.99, response.Price)

	mockService.AssertExpectations(t)
}

func TestCatalogCreateProductValidationError(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	reqBody := map[string]any{
		"name": "Incomplete Product",
	}

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/products", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestCatalogGetProductById(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	expectedProduct := &core.Product{
		Model:          gorm.Model{ID: 1},
		StoreProfileId: 1,
		CategoryId:     1,
		Name:           "Test Product",
		Price:          99.99,
		Sku:            "TEST-001",
		IsActive:       true,
	}

	mockService.On("FindProductById", uint(1)).Return(expectedProduct, nil)

	resp, err := http.Get(server.URL + "/api/v1/products/1")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.ProductResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, uint(1), response.ID)
	assert.Equal(t, "Test Product", response.Name)

	mockService.AssertExpectations(t)
}

func TestCatalogGetProductByIdNotFound(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	mockService.On("FindProductById", uint(9999)).Return(nil, assert.AnError)

	resp, err := http.Get(server.URL + "/api/v1/products/9999")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

	mockService.AssertExpectations(t)
}

func TestCatalogGetAllProducts(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	products := []*core.Product{
		{Model: gorm.Model{ID: 1}, Name: "Product 1", Price: 10.00, Sku: "SKU-001", IsActive: true},
		{Model: gorm.Model{ID: 2}, Name: "Product 2", Price: 20.00, Sku: "SKU-002", IsActive: true},
	}

	paginatedResult := core.NewPaginatedResult(products, 1, 20, 2)

	mockService.On("FindAllProducts", 1, 20).Return(paginatedResult, nil)

	resp, err := http.Get(server.URL + "/api/v1/products/all")
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

func TestCatalogGetProductsByCategory(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	products := []*core.Product{
		{Model: gorm.Model{ID: 1}, Name: "Product 1", CategoryId: 1, Price: 10.00, Sku: "SKU-001", IsActive: true},
		{Model: gorm.Model{ID: 2}, Name: "Product 2", CategoryId: 1, Price: 20.00, Sku: "SKU-002", IsActive: true},
	}

	mockService.On("FindProductsByCategory", uint64(1)).Return(products, nil)

	resp, err := http.Get(server.URL + "/api/v1/products?category_id=1")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response []dto.ProductResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Len(t, response, 2)

	mockService.AssertExpectations(t)
}

func TestCatalogGetProductsByCategoryMissingParam(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/products")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestCatalogGetProductsByCategoryInvalidParam(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/products?category_id=abc")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestCatalogUpdateProduct(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	existingProduct := &core.Product{
		Model:          gorm.Model{ID: 1},
		Name:           "Original Name",
		Price:          50.00,
		Sku:            "TEST-001",
		IsActive:       true,
		StoreProfileId: 1,
		CategoryId:     1,
	}

	updatedProduct := &core.Product{
		Model:          gorm.Model{ID: 1},
		Name:           "Updated Name",
		Price:          75.00,
		Sku:            "TEST-001",
		IsActive:       true,
		StoreProfileId: 1,
		CategoryId:     1,
	}

	mockService.On("FindProductById", uint(1)).Return(existingProduct, nil)
	mockService.On("UpdateProduct", uint(1), mock.Anything).Return(updatedProduct, nil)

	reqBody := map[string]any{
		"name":  "Updated Name",
		"price": 75.00,
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPatch, server.URL+"/api/v1/products/1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.ProductResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, "Updated Name", response.Name)
	assert.Equal(t, 75.00, response.Price)

	mockService.AssertExpectations(t)
}

func TestCatalogDeleteProduct(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	mockService.On("DeleteProduct", uint(1)).Return(nil)

	req, _ := http.NewRequest(http.MethodDelete, server.URL+"/api/v1/products/1", nil)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "Product deleted successfully", body["message"])

	mockService.AssertExpectations(t)
}

func TestCatalogInvalidIDFormat(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
	}{
		{
			name:       "get with invalid id returns 400",
			method:     http.MethodGet,
			path:       "/api/v1/products/abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "update with invalid id returns 400",
			method:     http.MethodPatch,
			path:       "/api/v1/products/abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "delete with invalid id returns 400",
			method:     http.MethodDelete,
			path:       "/api/v1/products/abc",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockProductService)
			server := setupCatalogTestServer(mockService)
			defer server.Close()

			var req *http.Request
			if tt.method == http.MethodPatch {
				body, _ := json.Marshal(map[string]any{"name": "Updated"})
				req, _ = http.NewRequest(tt.method, server.URL+tt.path, bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, _ = http.NewRequest(tt.method, server.URL+tt.path, nil)
			}

			resp, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

func TestCatalogPagination(t *testing.T) {
	mockService := new(MockProductService)
	server := setupCatalogTestServer(mockService)
	defer server.Close()

	products := []*core.Product{
		{Model: gorm.Model{ID: 1}, Name: "Product 1", Price: 10.00, Sku: "SKU-001", IsActive: true},
		{Model: gorm.Model{ID: 2}, Name: "Product 2", Price: 20.00, Sku: "SKU-002", IsActive: true},
	}

	paginatedResult := core.NewPaginatedResult(products, 1, 10, 2)

	mockService.On("FindAllProducts", 1, 10).Return(paginatedResult, nil)

	resp, err := http.Get(server.URL + "/api/v1/products/all?page=1&limit=10")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.PaginatedResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, 1, response.Page)
	assert.Equal(t, 10, response.Limit)
	assert.Equal(t, int64(2), response.Total)
	assert.Equal(t, int64(1), response.TotalPages)

	mockService.AssertExpectations(t)
}
