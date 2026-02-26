# HIOSOOO-RESTAPI

HIOSO OLT management REST API with support for multiple devices.

## Features

- 🚀 High-performance Go backend with Gin framework
- 📊 Multi-device support 
- 🔄 Concurrent scraping with worker pools
- 💾 SQLite database (zero-config, single file)
- 📦 Single binary deployment
- 🔒 Basic authentication for OLT access
- 🔐 JWT-based dashboard user authentication
- 📝 Response caching with configurable TTL


## Methode kerjanya :

This API operates using a simple three-step process:

1.  **Scraping**: Automatically fetches live data directly from the HIOSO OLT web interface.
2.  **Parsing**: Converts the raw data (HTML/JS) from the OLT into a clean, structured **JSON** format.
3.  **API Wrapper**: Wraps OLT functions (Reboot, Update Name, etc.) into a standard **REST API** for easy integration with other applications.


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

### Using Make

```bash
make install
make run
```

Note: `Makefile` workflow is Linux-focused.

### Development Mode

```bash
make dev
```

### Run Modes

From the project root, choose one of the following:

#### 1) Backend Only

```bash
./olt-api
```

Or run in development mode:

```bash
go run ./cmd/server/main.go
```

- Backend API: `http://localhost:3000`

#### 2) Backend + Frontend

```bash
chmod +x run.sh
./run.sh
```

- Backend API: `http://localhost:3000`
- Frontend dashboard: `http://localhost:5173`
- Stop services with `Ctrl+C`

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

auth:
  jwt_secret: ""         # use AUTH_JWT_SECRET in production
  access_token_ttl: 12h
  initial_username: admin
  initial_password: ""   # if empty, random password is generated on first run
```

Notes:
- `POST /api/v1/auth/login` returns bearer token for dashboard/API access.
- If `auth.initial_password` is empty and no user exists yet, backend creates admin user with random password and prints it in server logs.

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
