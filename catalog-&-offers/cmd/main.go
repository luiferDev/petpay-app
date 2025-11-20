package main

import (
	"petpay/catalog-offers-service/internal/application/adapters"
	"petpay/catalog-offers-service/internal/application/core"
	"petpay/catalog-offers-service/internal/infrastructure/db"
	"petpay/catalog-offers-service/internal/infrastructure/http"
	"petpay/catalog-offers-service/internal/infrastructure/repository"
)

func main() {
	db.DBConnection()
	db.Model.AutoMigrate(&core.Product{}, &core.ProductCategory{}, &core.ServiceOffering{})

	// dependency injection
	productRepo := repository.NewProductRepository(db.Model)
	productAdapter := adapters.NewProductAdapter(productRepo)
	controller := http.NewController(productAdapter)
	
	// config routes
	router := http.SetupRouter(controller)
	router.Run("8090")
}