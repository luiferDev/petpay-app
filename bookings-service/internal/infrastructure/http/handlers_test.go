package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"petpay/bookings-service/internal/application"
	"petpay/bookings-service/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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

type MockEventPub struct {
	mock.Mock
}

func (m *MockEventPub) PublishBookingCreated(ctx context.Context, bookingID string) error {
	args := m.Called(ctx, bookingID)
	return args.Error(0)
}

func (m *MockEventPub) PublishBookingConfirmed(ctx context.Context, bookingID string) error {
	args := m.Called(ctx, bookingID)
	return args.Error(0)
}

func (m *MockEventPub) PublishBookingCompleted(ctx context.Context, bookingID string) error {
	args := m.Called(ctx, bookingID)
	return args.Error(0)
}

func (m *MockEventPub) PublishBookingCancelled(ctx context.Context, bookingID, reason string) error {
	args := m.Called(ctx, bookingID, reason)
	return args.Error(0)
}

func (m *MockEventPub) PublishBookingRescheduled(ctx context.Context, bookingID string, oldStart, newStart string) error {
	args := m.Called(ctx, bookingID, oldStart, newStart)
	return args.Error(0)
}

func (m *MockEventPub) Close() error {
	args := m.Called()
	return args.Error(0)
}

type MockEmailCli struct {
	mock.Mock
}

func (m *MockEmailCli) SendBookingConfirmation(to string, bookingID string) error {
	args := m.Called(to, bookingID)
	return args.Error(0)
}

func (m *MockEmailCli) SendBookingReminder(to string, bookingID string, scheduledTime string) error {
	args := m.Called(to, bookingID, scheduledTime)
	return args.Error(0)
}

func (m *MockEmailCli) SendBookingCancellation(to string, bookingID string, reason string) error {
	args := m.Called(to, bookingID, reason)
	return args.Error(0)
}

func (m *MockEmailCli) SendBookingCompletion(to string, bookingID string) error {
	args := m.Called(to, bookingID)
	return args.Error(0)
}

func setupTestRouterWithMocks(mockRepo *MockBookingRepo, mockEvents *MockEventPub, mockEmail *MockEmailCli) *gin.Engine {
	gin.SetMode(gin.TestMode)

	// Create service with mocks
	service := application.NewBookingService(mockRepo, mockEvents, mockEmail)
	handler := NewBookingHandler(service)
	router := NewRouter(handler)

	return router
}

func TestCreateBooking_HTTP_Success(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPub)
	mockEmail := new(MockEmailCli)

	router := setupTestRouterWithMocks(mockRepo, mockEvents, mockEmail)

	bookingReq := CreateBookingRequest{
		CustomerID:      "cust-123",
		ProviderID:      "prov-456",
		PetID:           "pet-789",
		ServiceType:     "GROOMING",
		ScheduledStart:  time.Now(),
		ScheduledEnd:    time.Now().Add(1 * time.Hour),
		DurationMinutes: 60,
		Price:           50.00,
		Currency:        "USD",
		CustomerEmail:   "test@example.com",
	}

	expectedBooking := &domain.Booking{
		Model:           domain.Booking{}.Model,
		CustomerID:      "cust-123",
		ProviderID:      "prov-456",
		PetID:           "pet-789",
		ServiceType:     domain.ServiceTypeGrooming,
		Status:          domain.BookingStatusPending,
		ScheduledStart:  bookingReq.ScheduledStart,
		ScheduledEnd:    bookingReq.ScheduledEnd,
		DurationMinutes: 60,
		Price:           50.00,
		Currency:        "USD",
	}
	expectedBooking.ID = 1

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(expectedBooking, nil)
	mockEvents.On("PublishBookingCreated", mock.Anything, "1").Return(nil)
	mockEmail.On("SendBookingConfirmation", "test@example.com", "1").Return(nil)

	body, _ := json.Marshal(bookingReq)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
}

func TestGetBooking_HTTP_Success(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPub)
	mockEmail := new(MockEmailCli)

	router := setupTestRouterWithMocks(mockRepo, mockEvents, mockEmail)

	expectedBooking := &domain.Booking{
		Model:      domain.Booking{}.Model,
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		PetID:      "pet-789",
		Status:     domain.BookingStatusPending,
	}
	expectedBooking.ID = 1

	mockRepo.On("FindByID", mock.Anything, "1").Return(expectedBooking, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/bookings/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestGetBooking_HTTP_NotFound(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPub)
	mockEmail := new(MockEmailCli)

	router := setupTestRouterWithMocks(mockRepo, mockEvents, mockEmail)

	mockRepo.On("FindByID", mock.Anything, "999").Return(nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/bookings/999", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestListBookings_HTTP_ByCustomer(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPub)
	mockEmail := new(MockEmailCli)

	router := setupTestRouterWithMocks(mockRepo, mockEvents, mockEmail)

	expectedBookings := []*domain.Booking{
		{Model: domain.Booking{}.Model, CustomerID: "cust-123"},
		{Model: domain.Booking{}.Model, CustomerID: "cust-123"},
	}

	mockRepo.On("FindByCustomerID", mock.Anything, "cust-123").Return(expectedBookings, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/bookings?customerId=cust-123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestUpdateBookingStatus_HTTP_Success(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPub)
	mockEmail := new(MockEmailCli)

	router := setupTestRouterWithMocks(mockRepo, mockEvents, mockEmail)

	existingBooking := &domain.Booking{
		Model:      domain.Booking{}.Model,
		CustomerID: "cust-123",
		Status:     domain.BookingStatusPending,
	}
	existingBooking.ID = 1

	updatedBooking := &domain.Booking{
		Model:      domain.Booking{}.Model,
		CustomerID: "cust-123",
		Status:     domain.BookingStatusConfirmed,
	}
	updatedBooking.ID = 1

	mockRepo.On("FindByID", mock.Anything, "1").Return(existingBooking, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(updatedBooking, nil)
	mockEvents.On("PublishBookingConfirmed", mock.Anything, "1").Return(nil)

	body, _ := json.Marshal(UpdateStatusRequest{Status: "CONFIRMED"})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/bookings/1/status", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestCancelBooking_HTTP_Success(t *testing.T) {
	mockRepo := new(MockBookingRepo)
	mockEvents := new(MockEventPub)
	mockEmail := new(MockEmailCli)

	router := setupTestRouterWithMocks(mockRepo, mockEvents, mockEmail)

	existingBooking := &domain.Booking{
		Model:      domain.Booking{}.Model,
		CustomerID: "cust-123",
		Status:     domain.BookingStatusPending,
	}
	existingBooking.ID = 1

	cancelledBooking := &domain.Booking{
		Model:              domain.Booking{}.Model,
		CustomerID:         "cust-123",
		Status:             domain.BookingStatusCancelled,
		CancellationReason: "User requested",
	}
	cancelledBooking.ID = 1

	mockRepo.On("FindByID", mock.Anything, "1").Return(existingBooking, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(cancelledBooking, nil)
	mockEvents.On("PublishBookingCancelled", mock.Anything, "1", "User requested").Return(nil)
	mockEmail.On("SendBookingCancellation", "test@example.com", "1", "User requested").Return(nil)

	body, _ := json.Marshal(CancelBookingRequest{Reason: "User requested", CustomerEmail: "test@example.com"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookings/1/cancel", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}
