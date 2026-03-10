package main

import (
	"os"
	"petpay/catalog-offers-service/internal/application/adapters"
	"petpay/catalog-offers-service/internal/application/core"
	"petpay/catalog-offers-service/internal/infrastructure/db"
	"petpay/catalog-offers-service/internal/infrastructure/http"
	"petpay/catalog-offers-service/internal/infrastructure/repository"
)

func main() {
	// Get port from environment or default to 8081
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	db.DBConnection()
	db.Model.AutoMigrate(&core.Product{}, &core.ProductCategory{}, &core.ServiceOffering{})

	// dependency injection
	productRepo := repository.NewProductRepository(db.Model)
	productAdapter := adapters.NewProductAdapter(productRepo)
	controller := http.NewController(productAdapter)

	// config routes
	router := http.SetupRouter(controller)
	router.Run(":" + port)
}
