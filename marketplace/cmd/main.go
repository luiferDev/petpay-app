package main

import (
	"petpay/marketplace-service/internal/application/core"
	"petpay/marketplace-service/internal/application/services"
	"petpay/marketplace-service/internal/infrastructure/db"
	"petpay/marketplace-service/internal/infrastructure/http"
	"petpay/marketplace-service/internal/infrastructure/repository"
)

func main() {
	db.DBConnection()
	db.Model.AutoMigrate(&core.Order{}, &core.OrderItem{})
	
	// Inyección de dependencias
	orderRepo := repository.NewPostgresOrderRepository(db.Model)
	orderService := services.NewOrderService(orderRepo)
	controller := http.NewController(orderService)
	
	// Configurar rutas
	router := http.SetupRouter(controller)
	router.Run(":8080")
}