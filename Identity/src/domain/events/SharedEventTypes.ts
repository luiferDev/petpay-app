export interface BookingEvent {
  eventType: 'booking.created' | 'booking.confirmed' | 'booking.completed' | 'booking.cancelled' | 'booking.rescheduled'
  bookingId: string
  customerId: string
  serviceType: string
  status: string
  timestamp: string
}

export interface UserEvent {
  eventType: 'user.created' | 'service.provider.registered'
  userId: number
  email: string
  fullName: string
  role: string
  timestamp: string
}

export type DomainEvent = BookingEvent | UserEvent
