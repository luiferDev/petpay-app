package ports

import (
	"context"
)

type EventPublisher interface {
	PublishBookingCreated(ctx context.Context, bookingID string) error
	PublishBookingConfirmed(ctx context.Context, bookingID string) error
	PublishBookingCompleted(ctx context.Context, bookingID string) error
	PublishBookingCancelled(ctx context.Context, bookingID string, reason string) error
	PublishBookingRescheduled(ctx context.Context, bookingID string, oldStart, newStart string) error
	Close() error
}
