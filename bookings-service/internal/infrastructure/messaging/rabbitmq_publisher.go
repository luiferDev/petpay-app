package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"petpay/bookings-service/internal/ports"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	DomainEventsExchange = "petpay.domain.events"
	DLXExchange         = "petpay.domain.events.dlx"
)

type RabbitMQPublisher struct {
	mu      sync.RWMutex
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string

	closeChan chan struct{}
}

func NewRabbitMQPublisher(url string) ports.EventPublisher {
	p := &RabbitMQPublisher{
		url:       url,
		closeChan: make(chan struct{}),
	}

	go p.keepConnected()

	return p
}

func (p *RabbitMQPublisher) keepConnected() {
	backoff := 100 * time.Millisecond
	maxBackoff := 30 * time.Second

	for {
		select {
		case <-p.closeChan:
			return
		default:
		}

		conn, err := amqp.Dial(p.url)
		if err != nil {
			log.Printf("RabbitMQ connection failed: %v, retrying in %v", err, backoff)
			time.Sleep(backoff)
			backoff = time.Duration(min(int64(backoff)*2, int64(maxBackoff)))
			continue
		}

		backoff = 100 * time.Millisecond

		channel, err := conn.Channel()
		if err != nil {
			log.Printf("RabbitMQ channel creation failed: %v", err)
			conn.Close()
			continue
		}

		if err := channel.ExchangeDeclare(
			DLXExchange,
			"fanout",
			true,
			false,
			false,
			false,
			nil,
		); err != nil {
			log.Printf("RabbitMQ DLX exchange declare failed: %v", err)
			channel.Close()
			conn.Close()
			continue
		}

		if err := channel.ExchangeDeclare(
			DomainEventsExchange,
			"topic",
			true,
			false,
			false,
			false,
			amqp.Table{
				"x-dead-letter-exchange": DLXExchange,
			},
		); err != nil {
			log.Printf("RabbitMQ exchange declare failed: %v", err)
			channel.Close()
			conn.Close()
			continue
		}

		p.mu.Lock()
		if p.conn != nil {
			p.conn.Close()
		}
		if p.channel != nil {
			p.channel.Close()
		}
		p.conn = conn
		p.channel = channel
		p.mu.Unlock()

		log.Printf("RabbitMQ connected, exchange %q declared", DomainEventsExchange)

		notifyClose := conn.NotifyClose(make(chan *amqp.Error))
		select {
		case <-p.closeChan:
			p.mu.Lock()
			p.channel.Close()
			p.conn.Close()
			p.channel = nil
			p.conn = nil
			p.mu.Unlock()
			return
		case err := <-notifyClose:
			if err != nil {
				log.Printf("RabbitMQ connection closed: %v, reconnecting...", err)
			} else {
				log.Printf("RabbitMQ connection closed gracefully, reconnecting...")
			}
			p.mu.Lock()
			p.channel = nil
			p.conn = nil
			p.mu.Unlock()
		}
	}
}

func (p *RabbitMQPublisher) isConnected() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.conn != nil && p.channel != nil
}

func (p *RabbitMQPublisher) publish(ctx context.Context, routingKey string, payload interface{}) error {
	p.mu.RLock()
	ch := p.channel
	p.mu.RUnlock()

	if ch == nil {
		return fmt.Errorf("RabbitMQ not connected")
	}

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

	return ch.PublishWithContext(
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
	close(p.closeChan)
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
