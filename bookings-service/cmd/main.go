package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"petpay/bookings-service/internal/application"
	"petpay/bookings-service/internal/domain"
	"petpay/bookings-service/internal/infrastructure/config"
	infrahttp "petpay/bookings-service/internal/infrastructure/http"
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

	publisher := messaging.NewRabbitMQPublisher(cfg.RabbitMQ.URL)
	defer publisher.Close()

	emailClient := infrahttp.NewIdentityEmailClient(cfg.Identity.BaseURL, cfg.Identity.APIKey)

	repo := persistence.NewBookingRepository(db)
	service := application.NewBookingService(repo, publisher, emailClient)
	handler := infrahttp.NewBookingHandler(service)

	router := infrahttp.NewRouter(handler)

	addr := fmt.Sprintf("%s:%d", cfg.App.Host, cfg.App.Port)

	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	go func() {
		log.Printf("Bookings service starting on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited")
}
