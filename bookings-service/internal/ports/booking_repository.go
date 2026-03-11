package ports

import (
	"context"

	"petpay/bookings-service/internal/domain"
)

type BookingRepository interface {
	Create(ctx context.Context, booking *domain.Booking) (*domain.Booking, error)
	FindByID(ctx context.Context, id string) (*domain.Booking, error)
	FindAll(ctx context.Context) ([]*domain.Booking, error)
	FindByCustomerID(ctx context.Context, customerID string) ([]*domain.Booking, error)
	FindByProviderID(ctx context.Context, providerID string) ([]*domain.Booking, error)
	FindByPetID(ctx context.Context, petID string) ([]*domain.Booking, error)
	Update(ctx context.Context, booking *domain.Booking) (*domain.Booking, error)
	Delete(ctx context.Context, id string) error
}
