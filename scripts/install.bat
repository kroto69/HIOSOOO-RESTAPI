@echo off
echo Installing OLT API...

where go >nul 2>nul
if %errorlevel% neq 0 (
    echo Go not found. Install from: https://go.dev/dl/
    exit /b 1
)

echo Installing dependencies...
go mod download
go mod tidy

echo Building binary...
go build -o olt-api.exe ./cmd/server

if not exist "logs" mkdir logs
if not exist "configs" mkdir configs

if not exist "configs\config.yaml" (
    (
        echo server:
        echo   port: 3000
        echo   host: 0.0.0.0
        echo.
        echo database:
        echo   path: ./olt-api.db
        echo.
        echo cache:
        echo   enabled: true
        echo   ttl: 60s
        echo.
        echo scraper:
        echo   timeout: 30s
        echo   max_workers: 200
        echo.
        echo logging:
        echo   level: info
        echo   file: ./logs/app.log
    ) > configs\config.yaml
)

echo.
echo ============================================
echo   Installation complete!
echo.
echo   Start server: olt-api.exe
echo   API endpoint: http://localhost:3000
echo ============================================
