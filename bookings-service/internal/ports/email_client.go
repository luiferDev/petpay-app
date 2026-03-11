package ports

type EmailClient interface {
	SendBookingConfirmation(to string, bookingID string) error
	SendBookingReminder(to string, bookingID string, scheduledTime string) error
	SendBookingCancellation(to string, bookingID string, reason string) error
	SendBookingCompletion(to string, bookingID string) error
}
