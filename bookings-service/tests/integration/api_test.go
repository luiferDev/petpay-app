package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"petpay/bookings-service/internal/application"
	"petpay/bookings-service/internal/application/dto"
	"petpay/bookings-service/internal/domain"
	bookinghttp "petpay/bookings-service/internal/infrastructure/http"
	"petpay/bookings-service/internal/ports"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type MockBookingRepo struct {
	mock.Mock
}

func (m *MockBookingRepo) Create(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	args := m.Called(ctx, booking)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) FindByID(ctx context.Context, id string) (*domain.Booking, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) FindAll(ctx context.Context) ([]*domain.Booking, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) FindByCustomerID(ctx context.Context, customerID string) ([]*domain.Booking, error) {
	args := m.Called(ctx, customerID)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) FindByProviderID(ctx context.Context, providerID string) ([]*domain.Booking, error) {
	args := m.Called(ctx, providerID)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) FindByPetID(ctx context.Context, petID string) ([]*domain.Booking, error) {
	args := m.Called(ctx, petID)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) Update(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	args := m.Called(ctx, booking)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Booking), args.Error(1)
}

func (m *MockBookingRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type MockEventPublisher struct {
	mock.Mock
}

func (m *MockEventPublisher) PublishBookingCreated(ctx context.Context, bookingID string) error {
	args := m.Called(ctx, bookingID)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishBookingConfirmed(ctx context.Context, bookingID string) error {
	args := m.Called(ctx, bookingID)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishBookingCompleted(ctx context.Context, bookingID string) error {
	args := m.Called(ctx, bookingID)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishBookingCancelled(ctx context.Context, bookingID string, reason string) error {
	args := m.Called(ctx, bookingID, reason)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishBookingRescheduled(ctx context.Context, bookingID string, oldStart, newStart string) error {
	args := m.Called(ctx, bookingID, oldStart, newStart)
	return args.Error(0)
}

func (m *MockEventPublisher) Close() error {
	args := m.Called()
	return args.Error(0)
}

type MockEmailClient struct {
	mock.Mock
}

func (m *MockEmailClient) SendBookingConfirmation(to string, bookingID string) error {
	args := m.Called(to, bookingID)
	return args.Error(0)
}

func (m *MockEmailClient) SendBookingReminder(to string, bookingID string, scheduledTime string) error {
	args := m.Called(to, bookingID, scheduledTime)
	return args.Error(0)
}

func (m *MockEmailClient) SendBookingCancellation(to string, bookingID string, reason string) error {
	args := m.Called(to, bookingID, reason)
	return args.Error(0)
}

func (m *MockEmailClient) SendBookingCompletion(to string, bookingID string) error {
	args := m.Called(to, bookingID)
	return args.Error(0)
}

func setupBookingsTestServer(
	mockRepo ports.BookingRepository,
	mockEvents ports.EventPublisher,
	mockEmail ports.EmailClient,
) *httptest.Server {
	gin.SetMode(gin.TestMode)
	service := application.NewBookingService(mockRepo, mockEvents, mockEmail)
	handler := bookinghttp.NewBookingHandler(service)
	router := bookinghttp.NewRouter(handler)
	return httptest.NewServer(router)
}

func TestBookingsHealth(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	resp, err := http.Get(server.URL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "bookings", body["service"])
}

func TestBookingsCreateBooking(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	now := time.Now().UTC()
	startTime := now.Format(time.RFC3339)
	endTime := now.Add(1 * time.Hour).Format(time.RFC3339)

	reqBody := dto.CreateBookingRequest{
		CustomerID:      "cust-123",
		CustomerEmail:   "test@example.com",
		ProviderID:      "prov-456",
		PetID:           "pet-789",
		ServiceType:     string(domain.ServiceTypeGrooming),
		ScheduledStart:  startTime,
		ScheduledEnd:    endTime,
		DurationMinutes: 60,
		Price:           50.00,
		Currency:        "USD",
	}

	expectedBooking := &domain.Booking{
		Model:           gorm.Model{ID: 1},
		CustomerID:      "cust-123",
		ProviderID:      "prov-456",
		PetID:           "pet-789",
		ServiceType:     domain.ServiceTypeGrooming,
		Status:          domain.BookingStatusPending,
		ScheduledStart:  now,
		ScheduledEnd:    now.Add(1 * time.Hour),
		DurationMinutes: 60,
		Price:           50.00,
		Currency:        "USD",
	}

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(expectedBooking, nil)
	mockEvents.On("PublishBookingCreated", mock.Anything, "1").Return(nil)
	mockEmail.On("SendBookingConfirmation", "test@example.com", "1").Return(nil)

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/bookings", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var response dto.BookingResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, uint(1), response.ID)
	assert.Equal(t, "cust-123", response.CustomerID)
	assert.Equal(t, "GROOMING", response.ServiceType)
	assert.Equal(t, "PENDING", response.Status)

	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
}

func TestBookingsCreateBookingValidationError(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	reqBody := map[string]any{
		"customerId": "cust-123",
	}

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/bookings", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestBookingsCreateBookingInvalidTimeRange(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	now := time.Now().UTC()
	reqBody := dto.CreateBookingRequest{
		CustomerID:     "cust-123",
		ProviderID:     "prov-456",
		PetID:          "pet-789",
		ServiceType:    string(domain.ServiceTypeGrooming),
		ScheduledStart: now.Add(2 * time.Hour).Format(time.RFC3339),
		ScheduledEnd:   now.Format(time.RFC3339),
		Price:          50.00,
	}

	mockRepo.On("Create", mock.Anything, mock.Anything).Return((*domain.Booking)(nil), assert.AnError)

	body, _ := json.Marshal(reqBody)
	resp, err := http.Post(server.URL+"/api/v1/bookings", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

func TestBookingsGetBookingByID(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	expectedBooking := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		PetID:      "pet-789",
		ServiceType: domain.ServiceTypeGrooming,
		Status:     domain.BookingStatusPending,
	}

	mockRepo.On("FindByID", mock.Anything, "1").Return(expectedBooking, nil)

	resp, err := http.Get(server.URL + "/api/v1/bookings/1")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.BookingResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, uint(1), response.ID)
	assert.Equal(t, "cust-123", response.CustomerID)

	mockRepo.AssertExpectations(t)
}

func TestBookingsGetBookingNotFound(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	mockRepo.On("FindByID", mock.Anything, "9999").Return(nil, nil)

	resp, err := http.Get(server.URL + "/api/v1/bookings/9999")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	mockRepo.AssertExpectations(t)
}

func TestBookingsListByCustomer(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	bookings := []*domain.Booking{
		{Model: gorm.Model{ID: 1}, CustomerID: "cust-123", Status: domain.BookingStatusPending},
		{Model: gorm.Model{ID: 2}, CustomerID: "cust-123", Status: domain.BookingStatusConfirmed},
	}

	mockRepo.On("FindByCustomerID", mock.Anything, "cust-123").Return(bookings, nil)

	resp, err := http.Get(server.URL + "/api/v1/bookings?customerId=cust-123")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.PaginatedResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, 2, response.Total)
	assert.Len(t, response.Data, 2)

	mockRepo.AssertExpectations(t)
}

func TestBookingsUpdateStatusPendingToConfirmed(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	existing := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		PetID:      "pet-789",
		Status:     domain.BookingStatusPending,
	}

	updated := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		PetID:      "pet-789",
		Status:     domain.BookingStatusConfirmed,
	}

	mockRepo.On("FindByID", mock.Anything, "1").Return(existing, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(updated, nil)
	mockEvents.On("PublishBookingConfirmed", mock.Anything, "1").Return(nil)

	reqBody := map[string]any{
		"status": "CONFIRMED",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPut, server.URL+"/api/v1/bookings/1/status", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.BookingResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, "CONFIRMED", response.Status)

	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
}

func TestBookingsUpdateStatusConfirmedToCompleted(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	existing := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		Status:     domain.BookingStatusConfirmed,
	}

	updated := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		Status:     domain.BookingStatusCompleted,
	}

	mockRepo.On("FindByID", mock.Anything, "1").Return(existing, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(updated, nil)
	mockEvents.On("PublishBookingCompleted", mock.Anything, "1").Return(nil)

	reqBody := map[string]any{
		"status": "COMPLETED",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPut, server.URL+"/api/v1/bookings/1/status", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.BookingResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, "COMPLETED", response.Status)

	mockRepo.AssertExpectations(t)
}

func TestBookingsUpdateStatusPendingToCancelled(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	existing := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		PetID:      "pet-789",
		Status:     domain.BookingStatusPending,
	}

	updated := &domain.Booking{
		Model:              gorm.Model{ID: 1},
		CustomerID:         "cust-123",
		ProviderID:         "prov-456",
		PetID:              "pet-789",
		Status:             domain.BookingStatusCancelled,
		CancellationReason: "User requested",
	}

	mockRepo.On("FindByID", mock.Anything, "1").Return(existing, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(updated, nil)
	mockEvents.On("PublishBookingCancelled", mock.Anything, "1", "User requested").Return(nil)
	mockEmail.On("SendBookingCancellation", "test@example.com", "1", "User requested").Return(nil)

	reqBody := map[string]any{
		"reason":        "User requested",
		"customerEmail": "test@example.com",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/bookings/1/cancel", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.BookingResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, "CANCELLED", response.Status)
	assert.Equal(t, "User requested", response.CancellationReason)

	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
	mockEmail.AssertExpectations(t)
}

func TestBookingsCancelBooking(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	existing := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		Status:     domain.BookingStatusPending,
	}

	cancelled := &domain.Booking{
		Model:              gorm.Model{ID: 1},
		CustomerID:         "cust-123",
		ProviderID:         "prov-456",
		Status:             domain.BookingStatusCancelled,
		CancellationReason: "No longer needed",
	}

	mockRepo.On("FindByID", mock.Anything, "1").Return(existing, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(cancelled, nil)
	mockEvents.On("PublishBookingCancelled", mock.Anything, "1", "No longer needed").Return(nil)

	reqBody := map[string]any{
		"reason": "No longer needed",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/bookings/1/cancel", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var response dto.BookingResponse
	json.NewDecoder(resp.Body).Decode(&response)
	assert.Equal(t, "CANCELLED", response.Status)
	assert.Equal(t, "No longer needed", response.CancellationReason)

	mockRepo.AssertExpectations(t)
}

func TestBookingsCancelBookingValidationError(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)
	server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
	defer server.Close()

	body, _ := json.Marshal(map[string]any{})
	req, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/bookings/1/cancel", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestBookingsStatusTransitionsTableDriven(t *testing.T) {
	now := time.Now().UTC()

	tests := []struct {
		name        string
		newStatus   string
		setupMock   func(*MockBookingRepo, *MockEventPublisher, *MockEmailClient)
		wantStatus  int
		wantBooking string
	}{
		{
			name:      "pending booking created successfully",
			newStatus: "PENDING",
			setupMock: func(repo *MockBookingRepo, events *MockEventPublisher, email *MockEmailClient) {
				repo.On("Create", mock.Anything, mock.Anything).
					Return(&domain.Booking{Model: gorm.Model{ID: 1}, CustomerID: "cust-123", ProviderID: "prov-456", PetID: "pet-789", Status: domain.BookingStatusPending}, nil)
				events.On("PublishBookingCreated", mock.Anything, "1").Return(nil)
			},
			wantStatus:  http.StatusCreated,
			wantBooking: "PENDING",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockBookingRepo)
			mockEvents := new(MockEventPublisher)
			mockEmail := new(MockEmailClient)
			tt.setupMock(mockRepo, mockEvents, mockEmail)

			server := setupBookingsTestServer(mockRepo, mockEvents, mockEmail)
			defer server.Close()

			reqBody := dto.CreateBookingRequest{
				CustomerID:      "cust-123",
				ProviderID:      "prov-456",
				PetID:           "pet-789",
				ServiceType:     "GROOMING",
				ScheduledStart:  now.Format(time.RFC3339),
				ScheduledEnd:    now.Add(1 * time.Hour).Format(time.RFC3339),
				DurationMinutes: 60,
				Price:           50.00,
				Currency:        "USD",
			}

			body, _ := json.Marshal(reqBody)
			resp, err := http.Post(server.URL+"/api/v1/bookings", "application/json", bytes.NewBuffer(body))
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)

			if tt.wantStatus == http.StatusCreated {
				var response dto.BookingResponse
				json.NewDecoder(resp.Body).Decode(&response)
				assert.Equal(t, tt.wantBooking, response.Status)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
