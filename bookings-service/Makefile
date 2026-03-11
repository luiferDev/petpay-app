.PHONY: run build test lint

run:
	go run ./cmd/main.go

build:
	go build -o bin/bookings-service ./cmd/main.go

test:
	go test ./...

lint:
	golangci-lint run

fmt:
	go fmt ./...

tidy:
	go mod tidy
