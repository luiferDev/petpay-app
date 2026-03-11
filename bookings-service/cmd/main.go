package main

import (
	"fmt"
	"log"

	"petpay/bookings-service/internal/application"
	"petpay/bookings-service/internal/domain"
	"petpay/bookings-service/internal/infrastructure/config"
	"petpay/bookings-service/internal/infrastructure/http"
	"petpay/bookings-service/internal/infrastructure/messaging"
	"petpay/bookings-service/internal/infrastructure/persistence"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&domain.Booking{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	publisher, err := messaging.NewRabbitMQPublisher(cfg.RabbitMQ.URL)
	if err != nil {
		log.Printf("Warning: failed to connect to RabbitMQ: %v", err)
		publisher = nil
	}
	if publisher != nil {
		defer publisher.Close()
	}

	emailClient := http.NewIdentityEmailClient(cfg.Identity.BaseURL, cfg.Identity.APIKey)

	repo := persistence.NewBookingRepository(db)
	service := application.NewBookingService(repo, publisher, emailClient)
	handler := http.NewBookingHandler(service)

	router := http.NewRouter(handler)

	addr := fmt.Sprintf("%s:%d", cfg.App.Host, cfg.App.Port)
	log.Printf("Starting bookings service on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
