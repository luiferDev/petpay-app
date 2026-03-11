package application

import (
	"context"
	"testing"
	"time"

	"petpay/bookings-service/internal/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

type MockBookingRepository struct {
	mock.Mock
}

func (m *MockBookingRepository) Create(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	args := m.Called(ctx, booking)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) FindByID(ctx context.Context, id string) (*domain.Booking, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) FindAll(ctx context.Context) ([]*domain.Booking, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) FindByCustomerID(ctx context.Context, customerID string) ([]*domain.Booking, error) {
	args := m.Called(ctx, customerID)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) FindByProviderID(ctx context.Context, providerID string) ([]*domain.Booking, error) {
	args := m.Called(ctx, providerID)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) FindByPetID(ctx context.Context, petID string) ([]*domain.Booking, error) {
	args := m.Called(ctx, petID)
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) Update(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	args := m.Called(ctx, booking)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Booking), args.Error(1)
}

func (m *MockBookingRepository) Delete(ctx context.Context, id string) error {
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

func (m *MockEventPublisher) PublishBookingCancelled(ctx context.Context, bookingID, reason string) error {
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

func TestCreateBooking_Success(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	booking := &domain.Booking{
		CustomerID:      "cust-123",
		ProviderID:      "prov-456",
		PetID:           "pet-789",
		ServiceType:     domain.ServiceTypeGrooming,
		ScheduledStart:  time.Now(),
		ScheduledEnd:    time.Now().Add(1 * time.Hour),
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
		ScheduledStart:  booking.ScheduledStart,
		ScheduledEnd:    booking.ScheduledEnd,
		DurationMinutes: 60,
		Price:           50.00,
		Currency:        "USD",
	}

	mockRepo.On("Create", ctx, mock.Anything).Return(expectedBooking, nil)
	mockEvents.On("PublishBookingCreated", ctx, "1").Return(nil)
	mockEmail.On("SendBookingConfirmation", "test@example.com", "1").Return(nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.CreateBooking(ctx, booking, "test@example.com")

	assert.NoError(t, err)
	assert.Equal(t, expectedBooking, result)
	assert.Equal(t, domain.BookingStatusPending, result.Status)
	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
	mockEmail.AssertExpectations(t)
}

func TestCreateBooking_ValidationError(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	booking := &domain.Booking{
		CustomerID: "",
		ProviderID: "prov-456",
		PetID:      "pet-789",
	}

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.CreateBooking(ctx, booking, "")

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "customer ID is required")
	mockRepo.AssertNotCalled(t, "Create")
}

func TestCreateBooking_InvalidTimeRange(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	booking := &domain.Booking{
		CustomerID:      "cust-123",
		ProviderID:      "prov-456",
		PetID:           "pet-789",
		ScheduledStart:  time.Now().Add(1 * time.Hour),
		ScheduledEnd:    time.Now(),
		DurationMinutes: -10,
	}

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.CreateBooking(ctx, booking, "")

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "scheduled end cannot be before start")
}

func TestGetBooking_Success(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	expectedBooking := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		ProviderID: "prov-456",
		PetID:      "pet-789",
		Status:     domain.BookingStatusPending,
	}

	mockRepo.On("FindByID", ctx, "1").Return(expectedBooking, nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.GetBooking(ctx, "1")

	assert.NoError(t, err)
	assert.Equal(t, expectedBooking, result)
	mockRepo.AssertExpectations(t)
}

func TestGetBooking_NotFound(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	mockRepo.On("FindByID", ctx, "999").Return(nil, nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.GetBooking(ctx, "999")

	assert.Error(t, err)
	assert.Equal(t, ErrBookingNotFound, err)
	assert.Nil(t, result)
}

func TestListBookings_ByCustomerID(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	expectedBookings := []*domain.Booking{
		{Model: gorm.Model{ID: 1}, CustomerID: "cust-123"},
		{Model: gorm.Model{ID: 2}, CustomerID: "cust-123"},
	}

	mockRepo.On("FindByCustomerID", ctx, "cust-123").Return(expectedBookings, nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.ListBookings(ctx, BookingFilters{CustomerID: "cust-123"})

	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	mockRepo.AssertExpectations(t)
}

func TestListBookings_All(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	expectedBookings := []*domain.Booking{
		{Model: gorm.Model{ID: 1}, CustomerID: "cust-123"},
		{Model: gorm.Model{ID: 2}, CustomerID: "cust-456"},
	}

	mockRepo.On("FindAll", ctx).Return(expectedBookings, nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.ListBookings(ctx, BookingFilters{})

	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	mockRepo.AssertExpectations(t)
}

func TestUpdateBookingStatus_Success(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	existingBooking := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		Status:     domain.BookingStatusPending,
	}

	updatedBooking := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		Status:     domain.BookingStatusConfirmed,
	}

	mockRepo.On("FindByID", ctx, "1").Return(existingBooking, nil)
	mockRepo.On("Update", ctx, mock.Anything).Return(updatedBooking, nil)
	mockEvents.On("PublishBookingConfirmed", ctx, "1").Return(nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.UpdateBookingStatus(ctx, "1", domain.BookingStatusConfirmed, "")

	assert.NoError(t, err)
	assert.Equal(t, domain.BookingStatusConfirmed, result.Status)
	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
}

func TestUpdateBookingStatus_NotFound(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	mockRepo.On("FindByID", ctx, "999").Return(nil, nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.UpdateBookingStatus(ctx, "999", domain.BookingStatusConfirmed, "")

	assert.Error(t, err)
	assert.Equal(t, ErrBookingNotFound, err)
	assert.Nil(t, result)
}

func TestCancelBooking_Success(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	existingBooking := &domain.Booking{
		Model:      gorm.Model{ID: 1},
		CustomerID: "cust-123",
		Status:     domain.BookingStatusPending,
	}

	updatedBooking := &domain.Booking{
		Model:              gorm.Model{ID: 1},
		CustomerID:         "cust-123",
		Status:             domain.BookingStatusCancelled,
		CancellationReason: "User requested cancellation",
	}

	mockRepo.On("FindByID", ctx, "1").Return(existingBooking, nil)
	mockRepo.On("Update", ctx, mock.Anything).Return(updatedBooking, nil)
	mockEvents.On("PublishBookingCancelled", ctx, "1", "User requested cancellation").Return(nil)
	mockEmail.On("SendBookingCancellation", "test@example.com", "1", "User requested cancellation").Return(nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.CancelBooking(ctx, "1", "User requested cancellation", "test@example.com")

	assert.NoError(t, err)
	assert.Equal(t, domain.BookingStatusCancelled, result.Status)
	assert.Equal(t, "User requested cancellation", result.CancellationReason)
	mockRepo.AssertExpectations(t)
	mockEvents.AssertExpectations(t)
}

func TestCancelBooking_NotFound(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockBookingRepository)
	mockEvents := new(MockEventPublisher)
	mockEmail := new(MockEmailClient)

	mockRepo.On("FindByID", ctx, "999").Return(nil, nil)

	service := NewBookingService(mockRepo, mockEvents, mockEmail)
	result, err := service.CancelBooking(ctx, "999", "reason", "")

	assert.Error(t, err)
	assert.Equal(t, ErrBookingNotFound, err)
	assert.Nil(t, result)
}
