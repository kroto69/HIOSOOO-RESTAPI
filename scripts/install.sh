#!/bin/bash
set -e

echo "🚀 Installing OLT API..."

# Check Go
if ! command -v go &> /dev/null; then
    echo "❌ Go not found. Install from: https://go.dev/dl/"
    exit 1
fi

echo "✓ Go found: $(go version)"

# Install dependencies
echo "📦 Installing dependencies..."
go mod download
go mod tidy

# Build
echo "🔨 Building binary..."
go build -o olt-api ./cmd/server

# Create directories
mkdir -p logs configs

# Default config
if [ ! -f "configs/config.yaml" ]; then
    cat > configs/config.yaml <<EOF
server:
  port: 3000
  host: 0.0.0.0

database:
  path: ./olt-api.db

cache:
  enabled: true
  ttl: 60s

scraper:
  timeout: 30s
  max_workers: 200

logging:
  level: info
  file: ./logs/app.log
EOF
    echo "✓ Created default config"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              ✅ Installation complete!                    ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Start server:  ./olt-api                                 ║"
echo "║  API endpoint:  http://localhost:3000                     ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
