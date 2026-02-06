.PHONY: build run install clean test dev tidy

# Build the binary
build:
	go build -o olt-api ./cmd/server

# Run the built binary
run: build
	./olt-api

# Install dependencies and build
install:
	chmod +x scripts/install.sh
	./scripts/install.sh

# Clean build artifacts
clean:
	rm -f olt-api olt-api.exe
	rm -rf logs/*.log
	rm -f olt-api.db

# Run tests
test:
	go test -v ./...

# Run in development mode
dev:
	go run ./cmd/server/main.go

# Tidy dependencies
tidy:
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# Build for all platforms
build-all:
	GOOS=linux GOARCH=amd64 go build -o olt-api-linux-amd64 ./cmd/server
	GOOS=darwin GOARCH=amd64 go build -o olt-api-darwin-amd64 ./cmd/server
	GOOS=windows GOARCH=amd64 go build -o olt-api-windows-amd64.exe ./cmd/server
