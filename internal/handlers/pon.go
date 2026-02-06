package handlers

import (
	"olt-api/internal/config"
	"olt-api/internal/service"
	"olt-api/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetPONs handles GET /api/v1/devices/:device_id/pons
func GetPONs(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		deviceSvc := service.NewDeviceService(db, cfg)
		ponSvc := service.NewPONService(db, cfg, deviceSvc)

		pons, err := ponSvc.GetPONList(deviceID)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, pons, deviceID)
	}
}
