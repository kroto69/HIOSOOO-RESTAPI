package handlers

import (
	"olt-api/internal/config"
	"olt-api/internal/service"
	"olt-api/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSystemInfo handles GET /api/v1/devices/:id/system
func GetSystemInfo(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		svc := service.NewDeviceService(db, cfg)
		sysInfo, err := svc.GetSystemInfo(id)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, sysInfo, id)
	}
}
