package main

import "petpay/marketplace-service/internal/infrastructure/db"



func main() {
	db.DBConnection()
	//db.Model.AutoMigrate(&model.Order{}, &model.OrderItem{})
}