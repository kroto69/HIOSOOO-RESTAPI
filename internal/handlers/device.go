package handlers

import (
	"olt-api/internal/config"
	"olt-api/internal/database"
	"olt-api/internal/service"
	"olt-api/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateDevice handles POST /api/v1/devices
func CreateDevice(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req database.DeviceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		svc := service.NewDeviceService(db, cfg)
		device, err := svc.Create(&req)
		if err != nil {
			response.BadRequest(c, err.Error())
			return
		}

		// Return 200 OK because it could be an update
		response.SuccessWithMessage(c, "Device saved successfully", device)
	}
}

// ListDevices handles GET /api/v1/devices
func ListDevices(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		svc := service.NewDeviceService(db, cfg)
		devices, err := svc.GetAll()
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, devices, "")
	}
}

// GetDevice handles GET /api/v1/devices/:id
func GetDevice(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		svc := service.NewDeviceService(db, cfg)
		device, err := svc.GetByID(id)
		if err != nil {
			response.NotFound(c, err.Error())
			return
		}

		response.Success(c, device, id)
	}
}

// UpdateDevice handles PUT /api/v1/devices/:id
func UpdateDevice(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		var req database.DeviceUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		svc := service.NewDeviceService(db, cfg)
		device, err := svc.Update(id, &req)
		if err != nil {
			response.NotFound(c, err.Error())
			return
		}

		response.SuccessWithMessage(c, "Device updated successfully", device)
	}
}

// DeleteDevice handles DELETE /api/v1/devices/:id
func DeleteDevice(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		svc := service.NewDeviceService(db, cfg)
		if err := svc.Delete(id); err != nil {
			response.NotFound(c, err.Error())
			return
		}

		response.SuccessWithMessage(c, "Device deleted successfully", nil)
	}
}

// DeleteAllDevices handles DELETE /api/v1/devices
func DeleteAllDevices(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		svc := service.NewDeviceService(db, cfg)
		if err := svc.DeleteAll(); err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.SuccessWithMessage(c, "All devices deleted successfully", nil)
	}
}

// CheckDeviceStatus handles GET /api/v1/devices/:id/status
func CheckDeviceStatus(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		svc := service.NewDeviceService(db, cfg)
		status, err := svc.CheckStatus(id)
		if err != nil {
			response.NotFound(c, err.Error())
			return
		}

		response.Success(c, status, id)
	}
}
