package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"petpay/catalog-offers-service/internal/application/adapters"
	"petpay/catalog-offers-service/internal/application/core"
	"petpay/catalog-offers-service/internal/infrastructure/db"
	infrahttp "petpay/catalog-offers-service/internal/infrastructure/http"
	"petpay/catalog-offers-service/internal/infrastructure/repository"
)

func main() {
	// Get port from environment or default to 8081
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	database, err := db.NewPostgresConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	database.AutoMigrate(&core.Product{}, &core.ProductCategory{}, &core.ServiceOffering{})

	// dependency injection
	productRepo := repository.NewProductRepository(database)
	productAdapter := adapters.NewProductAdapter(productRepo)
	controller := infrahttp.NewController(productAdapter)

	// config routes
	router := infrahttp.SetupRouter(controller)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		log.Printf("Catalog service starting on :%s", port)
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
