package persistence

import (
	"context"
	"errors"

	"petpay/bookings-service/internal/domain"
	"petpay/bookings-service/internal/ports"

	"gorm.io/gorm"
)

type BookingRepository struct {
	db *gorm.DB
}

func NewBookingRepository(db *gorm.DB) ports.BookingRepository {
	return &BookingRepository{db: db}
}

func (r *BookingRepository) Create(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	if err := r.db.WithContext(ctx).Create(booking).Error; err != nil {
		return nil, err
	}
	return booking, nil
}

func (r *BookingRepository) FindByID(ctx context.Context, id string) (*domain.Booking, error) {
	var booking domain.Booking
	if err := r.db.WithContext(ctx).First(&booking, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &booking, nil
}

func (r *BookingRepository) FindAll(ctx context.Context) ([]*domain.Booking, error) {
	var bookings []*domain.Booking
	if err := r.db.WithContext(ctx).Find(&bookings).Error; err != nil {
		return nil, err
	}
	return bookings, nil
}

func (r *BookingRepository) FindByCustomerID(ctx context.Context, customerID string) ([]*domain.Booking, error) {
	var bookings []*domain.Booking
	if err := r.db.WithContext(ctx).Where("customer_id = ?", customerID).Find(&bookings).Error; err != nil {
		return nil, err
	}
	return bookings, nil
}

func (r *BookingRepository) FindByProviderID(ctx context.Context, providerID string) ([]*domain.Booking, error) {
	var bookings []*domain.Booking
	if err := r.db.WithContext(ctx).Where("provider_id = ?", providerID).Find(&bookings).Error; err != nil {
		return nil, err
	}
	return bookings, nil
}

func (r *BookingRepository) FindByPetID(ctx context.Context, petID string) ([]*domain.Booking, error) {
	var bookings []*domain.Booking
	if err := r.db.WithContext(ctx).Where("pet_id = ?", petID).Find(&bookings).Error; err != nil {
		return nil, err
	}
	return bookings, nil
}

func (r *BookingRepository) Update(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	if err := r.db.WithContext(ctx).Save(booking).Error; err != nil {
		return nil, err
	}
	return booking, nil
}

func (r *BookingRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Booking{}, "id = ?", id).Error
}
