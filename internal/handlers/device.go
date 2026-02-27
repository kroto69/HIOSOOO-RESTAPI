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
		writeAuditLog(c, db, "device.saved", "device", device.ID, map[string]interface{}{
			"name": device.Name,
			"host": device.BaseURL,
			"port": device.Port,
		})
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

		writeAuditLog(c, db, "device.updated", "device", device.ID, map[string]interface{}{
			"name":   device.Name,
			"status": device.Status,
		})
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

		writeAuditLog(c, db, "device.deleted", "device", id, nil)
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

		writeAuditLog(c, db, "device.deleted_all", "device", "", nil)
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

		reachable, _ := status["reachable"].(bool)
		writeAuditLog(c, db, "device.status.checked", "device", id, map[string]interface{}{
			"reachable": reachable,
		})
		response.Success(c, status, id)
	}
}

// CheckDeviceConnection handles POST /api/v1/devices/check-connection
func CheckDeviceConnection(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req database.DeviceConnectionCheckRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		svc := service.NewDeviceService(db, cfg)
		status, err := svc.CheckConnectionPayload(&req)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		reachable, _ := status["reachable"].(bool)
		authenticated, _ := status["authenticated"].(bool)
		writeAuditLog(c, db, "device.connection.checked", "device", "", map[string]interface{}{
			"host":          req.BaseURL,
			"port":          req.Port,
			"reachable":     reachable,
			"authenticated": authenticated,
		})

		response.Success(c, status, "")
	}
}
