package main

import (
	"petpay/marketplace-service/db"
	//"petpay/marketplace-service/model"
)

func main() {
	db.DBConnection()
	//db.Model.AutoMigrate(&model.Order{}, &model.OrderItem{})
}