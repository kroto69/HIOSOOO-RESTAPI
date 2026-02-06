# HIOSOOO-RESTAPI

HIOSO OLT management REST API with support for multiple devices.

## Features

- 🚀 High-performance Go backend with Gin framework
- 📊 Multi-device support (4+ OLTs with 1000+ ONUs each)
- 🔄 Concurrent scraping with worker pools
- 💾 SQLite database (zero-config, single file)
- 📦 Single binary deployment
- 🔒 Basic authentication for OLT access
- 📝 Response caching with configurable TTL

## Quick Start

### Linux/Mac

```bash
# Clone repository
git clone https://github.com/kroto69/HIOSOOO-RESTAPI.git
cd HIOSOOO-RESTAPI

# Install and Run
chmod +x scripts/install.sh
./scripts/install.sh
./olt-api
```

### Windows

```cmd
git clone https://github.com/kroto69/HIOSOOO-RESTAPI.git
cd HIOSOOO-RESTAPI
scripts\install.bat
olt-api.exe
```

### Using Make

```bash
make install
make run
```

### Development Mode

```bash
make dev
```

## API Documentation


Full API documentation is available in [API.md](API.md).

## Configuration

Edit `configs/config.yaml` to customize settings:

```yaml
server:
  port: 3000
  host: 0.0.0.0
  read_timeout: 30s
  write_timeout: 30s

database:
  path: ./olt-api.db

cache:
  enabled: true
  ttl: 60s

scraper:
  timeout: 30s
  max_workers: 200
  retry_attempts: 3

logging:
  level: info
  file: ./logs/app.log
```

## API Response Format

All responses follow this format:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {},
  "device_id": "olt-001",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Performance

- Handles 4000+ concurrent ONU operations
- 200 worker goroutines for parallel scraping
- Connection pooling (100 max idle connections per host)
- Response caching with 60s TTL (configurable)
- SQLite for fast local storage

## Project Structure

```
olt-api/
├── cmd/server/main.go          # Application entry point
├── internal/
│   ├── config/                 # Configuration loading
│   ├── database/               # Database models and setup
│   ├── handlers/               # HTTP handlers
│   ├── middleware/             # Gin middleware
│   ├── parser/                 # HTML/JS array parsing
│   ├── scraper/                # HTTP client and worker pool
│   └── service/                # Business logic
├── pkg/response/               # Response helpers
├── configs/config.yaml         # Configuration file
├── scripts/                    # Installation scripts
├── Makefile                    # Build commands
└── README.md                   # This file
```

## License

MIT



This project was built by **[Kroto69]** with the assistance of AI technology.

---
*Developed with efficient coding practices and modern Go patterns.*
