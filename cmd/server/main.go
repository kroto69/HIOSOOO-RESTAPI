package main

import (
	"fmt"
	"log"
	"os"

	"olt-api/internal/config"
	"olt-api/internal/database"
	"olt-api/internal/handlers"
	"olt-api/internal/middleware"
	"olt-api/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// Create logs directory
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Printf("Warning: could not create logs directory: %v", err)
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Initialize database
	db, err := database.Init(cfg.Database.Path)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Ensure initial admin account exists
	authSvc := service.NewAuthService(db, cfg)
	if err := authSvc.EnsureInitialAdmin(); err != nil {
		log.Fatal("Failed to initialize auth user:", err)
	}

	// Set Gin mode based on logging level
	if cfg.Logging.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize router
	router := gin.New()

	// Add middleware
	router.Use(middleware.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())

	// Health check endpoint
	router.GET("/health", handlers.Health)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/login", handlers.Login(db, cfg))
		}

		protected := v1.Group("")
		protected.Use(middleware.AuthRequired(cfg.Auth.JWTSecret))
		{
			protected.GET("/audit-logs", handlers.ListAuditLogs(db, cfg))

			authProtected := protected.Group("/auth")
			{
				authProtected.GET("/me", handlers.Me(db, cfg))
				authProtected.POST("/change-password", handlers.ChangePassword(db, cfg))
				authProtected.GET("/users", handlers.ListUsers(db, cfg))
				authProtected.POST("/users", handlers.CreateUser(db, cfg))
				authProtected.PUT("/users/:id/password", handlers.ResetUserPassword(db, cfg))
			}

			// Device management
			devices := protected.Group("/devices")
			{
				devices.POST("", handlers.CreateDevice(db, cfg))
				devices.GET("", handlers.ListDevices(db, cfg))
				devices.GET("/:id", handlers.GetDevice(db, cfg))
				devices.PUT("/:id", handlers.UpdateDevice(db, cfg))
				devices.DELETE("/:id", handlers.DeleteDevice(db, cfg))
				devices.DELETE("", handlers.DeleteAllDevices(db, cfg))
				devices.GET("/:id/status", handlers.CheckDeviceStatus(db, cfg))

				// PON operations (using :id consistently)
				devices.GET("/:id/pons", handlers.GetPONs(db, cfg))

				// ONU operations
				devices.GET("/:id/onus", handlers.GetONUs(db, cfg))
				devices.GET("/:id/pons/:pon_id/onus", handlers.GetONUs(db, cfg))
				devices.GET("/:id/onus/:onu_id", handlers.GetONUDetail(db, cfg))
				devices.GET("/:id/onus/:onu_id/traffic", handlers.GetONUTraffic(db, cfg))
				devices.PUT("/:id/onus/:onu_id", handlers.UpdateONU(db, cfg))
				devices.POST("/:id/onus/:onu_id/action", handlers.ONUAction(db, cfg))
				devices.DELETE("/:id/onus/:onu_id", handlers.DeleteONU(db, cfg))

				// System operations
				devices.GET("/:id/system", handlers.GetSystemInfo(db, cfg))
				devices.POST("/:id/save-config", handlers.SaveConfig(db, cfg))
				devices.GET("/:id/logs", handlers.GetLogs(db, cfg))
			}
		}
	}

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	fmt.Println("╔═══════════════════════════════════════════════════════════╗")
	fmt.Println("║                    OLT Management API                     ║")
	fmt.Println("╠═══════════════════════════════════════════════════════════╣")
	fmt.Printf("║  🚀 Server starting on %-35s ║\n", addr)
	fmt.Println("║                                                           ║")
	fmt.Println("║  Endpoints:                                               ║")
	fmt.Println("║    GET  /health                  - Health check           ║")
	fmt.Println("║    POST /api/v1/auth/login       - Login user             ║")
	fmt.Println("║    POST /api/v1/devices          - Add device             ║")
	fmt.Println("║    GET  /api/v1/devices          - List devices           ║")
	fmt.Println("║    GET  /api/v1/audit-logs       - User activity logs     ║")
	fmt.Println("║    GET  /api/v1/devices/:id/pons - Get PON list           ║")
	fmt.Println("║    GET  /api/v1/devices/:id/pons/:pon/onus - Get ONUs     ║")
	fmt.Println("╚═══════════════════════════════════════════════════════════╝")

	if err := router.Run(addr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
