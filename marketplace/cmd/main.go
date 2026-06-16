package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/services"
	"petpay/marketplace-service/internal/infrastructure/db"
	infrahttp "petpay/marketplace-service/internal/infrastructure/http"
	"petpay/marketplace-service/internal/infrastructure/repository"
)

func main() {
	database, err := db.NewPostgresConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	database.AutoMigrate(&core.Order{}, &core.OrderItem{})

	// DI
	orderRepo := repository.NewPostgresOrderRepository(database)
	orderService := services.NewOrderService(orderRepo)
	controller := infrahttp.NewController(orderService)

	// Routes
	router := infrahttp.SetupRouter(controller)

	srv := &http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	go func() {
		log.Printf("Marketplace service starting on :8080")
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
