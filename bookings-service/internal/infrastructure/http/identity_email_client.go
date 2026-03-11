package http

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"petpay/bookings-service/internal/ports"
)

type IdentityEmailClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

type EmailRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
	Type    string `json:"type"`
}

func NewIdentityEmailClient(baseURL, apiKey string) ports.EmailClient {
	return &IdentityEmailClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *IdentityEmailClient) sendEmail(ctx context.Context, emailType, to, subject, body string) error {
	reqBody := EmailRequest{
		To:      to,
		Subject: subject,
		Body:    body,
		Type:    emailType,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal email request: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		"POST",
		c.baseURL+"/api/v1/emails/send",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("email service returned status %d", resp.StatusCode)
	}

	return nil
}

func (c *IdentityEmailClient) SendBookingConfirmation(to string, bookingID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	subject := "Booking Confirmed - Petpay"
	body := fmt.Sprintf("Your booking %s has been confirmed. Thank you for using Petpay!", bookingID)

	return c.sendEmail(ctx, "booking_confirmation", to, subject, body)
}

func (c *IdentityEmailClient) SendBookingReminder(to string, bookingID string, scheduledTime string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	subject := "Booking Reminder - Petpay"
	body := fmt.Sprintf("Reminder: Your booking %s is scheduled for %s.", bookingID, scheduledTime)

	return c.sendEmail(ctx, "booking_reminder", to, subject, body)
}

func (c *IdentityEmailClient) SendBookingCancellation(to string, bookingID string, reason string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	subject := "Booking Cancelled - Petpay"
	body := fmt.Sprintf("Your booking %s has been cancelled. Reason: %s", bookingID, reason)

	return c.sendEmail(ctx, "booking_cancellation", to, subject, body)
}

func (c *IdentityEmailClient) SendBookingCompletion(to string, bookingID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	subject := "Booking Completed - Petpay"
	body := fmt.Sprintf("Your booking %s has been completed. Thank you for using Petpay!", bookingID)

	return c.sendEmail(ctx, "booking_completion", to, subject, body)
}
