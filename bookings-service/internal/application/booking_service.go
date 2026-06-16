package application

import (
	"context"
	"errors"
	"fmt"
	"time"

	"petpay/bookings-service/internal/domain"
	"petpay/bookings-service/internal/ports"
)

var (
	ErrBookingNotFound = errors.New("booking not found")
	ErrInvalidBooking  = errors.New("invalid booking data")
)

type BookingService struct {
	repo   ports.BookingRepository
	email  ports.EmailClient
	events ports.EventPublisher
}

func NewBookingService(repo ports.BookingRepository, events ports.EventPublisher, email ports.EmailClient) *BookingService {
	return &BookingService{
		repo:   repo,
		events: events,
		email:  email,
	}
}

func (s *BookingService) CreateBooking(ctx context.Context, booking *domain.Booking, customerEmail string) (*domain.Booking, error) {
	if err := s.validateBooking(booking); err != nil {
		return nil, err
	}

	booking.Status = domain.BookingStatusPending
	booking.CreatedAt = time.Now()
	booking.UpdatedAt = time.Now()

	created, err := s.repo.Create(ctx, booking)
	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	if s.events != nil {
		if err := s.events.PublishBookingCreated(ctx, fmt.Sprintf("%d", created.ID)); err != nil {
			fmt.Printf("Warning: failed to publish booking created event: %v\n", err)
		}
	}

	if customerEmail != "" {
		if err := s.email.SendBookingConfirmation(customerEmail, fmt.Sprintf("%d", created.ID)); err != nil {
			fmt.Printf("Warning: failed to send confirmation email: %v\n", err)
		}
	}

	return created, nil
}

func (s *BookingService) GetBooking(ctx context.Context, id string) (*domain.Booking, error) {
	booking, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get booking: %w", err)
	}
	if booking == nil {
		return nil, ErrBookingNotFound
	}
	return booking, nil
}

func (s *BookingService) ListBookings(ctx context.Context, filters BookingFilters) ([]*domain.Booking, error) {
	if filters.CustomerID != "" {
		return s.repo.FindByCustomerID(ctx, filters.CustomerID)
	}
	if filters.ProviderID != "" {
		return s.repo.FindByProviderID(ctx, filters.ProviderID)
	}
	if filters.PetID != "" {
		return s.repo.FindByPetID(ctx, filters.PetID)
	}
	return s.repo.FindAll(ctx)
}

func (s *BookingService) UpdateBookingStatus(ctx context.Context, id string, status domain.BookingStatus, customerEmail string) (*domain.Booking, error) {
	booking, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get booking: %w", err)
	}
	if booking == nil {
		return nil, ErrBookingNotFound
	}

	oldStatus := booking.Status
	booking.Status = status
	booking.UpdatedAt = time.Now()

	updated, err := s.repo.Update(ctx, booking)
	if err != nil {
		return nil, fmt.Errorf("failed to update booking: %w", err)
	}

	switch status {
	case domain.BookingStatusConfirmed:
		if s.events != nil {
			if err := s.events.PublishBookingConfirmed(ctx, id); err != nil {
				fmt.Printf("Warning: failed to publish booking confirmed event: %v\n", err)
			}
		}
	case domain.BookingStatusCompleted:
		if s.events != nil {
			if err := s.events.PublishBookingCompleted(ctx, id); err != nil {
				fmt.Printf("Warning: failed to publish booking completed event: %v\n", err)
			}
		}
		if customerEmail != "" {
			if err := s.email.SendBookingCompletion(customerEmail, id); err != nil {
				fmt.Printf("Warning: failed to send completion email: %v\n", err)
			}
		}
	case domain.BookingStatusCancelled:
		reason := "Cancelled by user"
		if s.events != nil {
			if err := s.events.PublishBookingCancelled(ctx, id, reason); err != nil {
				fmt.Printf("Warning: failed to publish booking cancelled event: %v\n", err)
			}
		}
		if customerEmail != "" {
			if err := s.email.SendBookingCancellation(customerEmail, id, reason); err != nil {
				fmt.Printf("Warning: failed to send cancellation email: %v\n", err)
			}
		}
	default:
		if oldStatus != status {
			fmt.Printf("Status changed from %s to %s for booking %s\n", oldStatus, status, id)
		}
	}

	return updated, nil
}

func (s *BookingService) CancelBooking(ctx context.Context, id, reason, customerEmail string) (*domain.Booking, error) {
	booking, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get booking: %w", err)
	}
	if booking == nil {
		return nil, ErrBookingNotFound
	}

	booking.Status = domain.BookingStatusCancelled
	booking.CancellationReason = reason
	booking.UpdatedAt = time.Now()

	updated, err := s.repo.Update(ctx, booking)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel booking: %w", err)
	}

	if s.events != nil {
		if err := s.events.PublishBookingCancelled(ctx, id, reason); err != nil {
			fmt.Printf("Warning: failed to publish booking cancelled event: %v\n", err)
		}
	}

	if customerEmail != "" {
		if err := s.email.SendBookingCancellation(customerEmail, id, reason); err != nil {
			fmt.Printf("Warning: failed to send cancellation email: %v\n", err)
		}
	}

	return updated, nil
}

func (s *BookingService) validateBooking(booking *domain.Booking) error {
	if booking.CustomerID == "" {
		return fmt.Errorf("%w: customer ID is required", ErrInvalidBooking)
	}
	if booking.ProviderID == "" {
		return fmt.Errorf("%w: provider ID is required", ErrInvalidBooking)
	}
	if booking.PetID == "" {
		return fmt.Errorf("%w: pet ID is required", ErrInvalidBooking)
	}
	if booking.ScheduledEnd.Before(booking.ScheduledStart) {
		return fmt.Errorf("%w: scheduled end cannot be before start", ErrInvalidBooking)
	}
	return nil
}

type BookingFilters struct {
	CustomerID string
	ProviderID string
	PetID      string
	Status     domain.BookingStatus
}
