package db

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var Model *gorm.DB

func DBConnection() {
	// Load .env file
	if err := godotenv.Load("./.env"); err != nil {
		log.Println("No .env file found, using default values")
	}

	// Get environment variables with defaults
	host := getEnvOrDefault("DB_HOST", "localhost")
	user := getEnvOrDefault("DB_USER", "luifer")
	password := getEnvOrDefault("DB_PASSWORD", "123456789")
	dbname := getEnvOrDefault("DB_NAME", "marketplace_db")
	port := getEnvOrDefault("DB_PORT", "5432")
	sslmode := getEnvOrDefault("DB_SSLMODE", "disable")

	// Build DSN
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		host, user, password, dbname, port, sslmode)
	
	log.Printf("Connecting to: host=%s user=%s dbname=%s port=%s", host, user, dbname, port)

	var err error
	Model, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Database connection failed: %v", err)
		log.Printf("DSN used: %s", dsn)
		log.Fatal("failed to connect database")
	} else {
		log.Println("connected to database")
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
