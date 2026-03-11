package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"petpay/bookings-service/internal/ports"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	DomainEventsExchange = "petpay.domain.events"
)

type RabbitMQPublisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewRabbitMQPublisher(url string) (ports.EventPublisher, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	channel, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	err = channel.ExchangeDeclare(
		DomainEventsExchange,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		channel.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	return &RabbitMQPublisher{
		conn:    conn,
		channel: channel,
	}, nil
}

func (p *RabbitMQPublisher) publish(ctx context.Context, routingKey string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	message := amqp.Publishing{
		ContentType:  "application/json",
		Body:         body,
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now(),
	}

	return p.channel.PublishWithContext(
		ctx,
		DomainEventsExchange,
		routingKey,
		false,
		false,
		message,
	)
}

func (p *RabbitMQPublisher) PublishBookingCreated(ctx context.Context, bookingID string) error {
	payload := map[string]interface{}{
		"bookingId":   bookingID,
		"eventType":   "booking.created",
		"publishedAt": time.Now().UTC().Format(time.RFC3339),
	}
	return p.publish(ctx, "booking.created", payload)
}

func (p *RabbitMQPublisher) PublishBookingConfirmed(ctx context.Context, bookingID string) error {
	payload := map[string]interface{}{
		"bookingId":   bookingID,
		"eventType":   "booking.confirmed",
		"publishedAt": time.Now().UTC().Format(time.RFC3339),
	}
	return p.publish(ctx, "booking.confirmed", payload)
}

func (p *RabbitMQPublisher) PublishBookingCompleted(ctx context.Context, bookingID string) error {
	payload := map[string]interface{}{
		"bookingId":   bookingID,
		"eventType":   "booking.completed",
		"publishedAt": time.Now().UTC().Format(time.RFC3339),
	}
	return p.publish(ctx, "booking.completed", payload)
}

func (p *RabbitMQPublisher) PublishBookingCancelled(ctx context.Context, bookingID string, reason string) error {
	payload := map[string]interface{}{
		"bookingId":   bookingID,
		"eventType":   "booking.cancelled",
		"reason":      reason,
		"publishedAt": time.Now().UTC().Format(time.RFC3339),
	}
	return p.publish(ctx, "booking.cancelled", payload)
}

func (p *RabbitMQPublisher) PublishBookingRescheduled(ctx context.Context, bookingID string, oldStart, newStart string) error {
	payload := map[string]interface{}{
		"bookingId":   bookingID,
		"eventType":   "booking.rescheduled",
		"oldStart":    oldStart,
		"newStart":    newStart,
		"publishedAt": time.Now().UTC().Format(time.RFC3339),
	}
	return p.publish(ctx, "booking.rescheduled", payload)
}

func (p *RabbitMQPublisher) Close() error {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
