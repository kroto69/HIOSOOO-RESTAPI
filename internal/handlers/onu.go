package handlers

import (
	"olt-api/internal/config"
	"olt-api/internal/service"
	"olt-api/pkg/response"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// normalizeONUID converts simplified ONU ID (e.g., "1:8") to full format ("0/1:8")
func normalizeONUID(onuID string) string {
	// If format is "X:Y" where X is a number, convert to "0/X:Y"
	if parts := strings.Split(onuID, ":"); len(parts) == 2 {
		ponPart := parts[0]
		onuPart := parts[1]
		// Check if ponPart is just a number (e.g., "1" not "0/1")
		if _, err := strconv.Atoi(ponPart); err == nil {
			return "0/" + ponPart + ":" + onuPart
		}
	}
	return onuID
}

// GetONUs handles:
// - GET /api/v1/devices/:device_id/pons/:pon_id/onus
// - GET /api/v1/devices/:device_id/onus?pon_id=...
func GetONUs(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		ponID := strings.TrimSpace(c.Param("pon_id"))
		if ponID == "" {
			ponID = strings.TrimSpace(c.Query("pon_id"))
		}

		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}
		if ponID == "" {
			response.BadRequest(c, "PON ID is required")
			return
		}

		// Optional filter (online, offline, etc.)
		filter := c.Query("filter")

		// Helper: If ponID is just a single number (e.g. "1"), convert to "0/1"
		if _, err := strconv.Atoi(ponID); err == nil {
			ponID = "0/" + ponID
		}

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		onus, err := onuSvc.GetONUsByPON(deviceID, ponID, filter)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, onus, deviceID)
	}
}

// GetONUDetail handles GET /api/v1/devices/:device_id/onus/:onu_id
func GetONUDetail(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		onuID := c.Param("onu_id")

		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}
		if onuID == "" {
			response.BadRequest(c, "ONU ID is required")
			return
		}

		// Convert simplified ONU ID to full format
		onuID = normalizeONUID(onuID)

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		detail, err := onuSvc.GetONUDetail(deviceID, onuID)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, detail, deviceID)
	}
}

// GetONUTraffic handles GET /api/v1/devices/:id/onus/:onu_id/traffic
func GetONUTraffic(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		onuID := c.Param("onu_id")

		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}
		if onuID == "" {
			response.BadRequest(c, "ONU ID is required")
			return
		}

		// Convert simplified ONU ID to full format
		onuID = normalizeONUID(onuID)

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		traffic, err := onuSvc.GetONUTraffic(deviceID, onuID)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, traffic, deviceID)
	}
}

// ONUAction handles POST /api/v1/devices/:device_id/onus/:onu_id/action
func ONUAction(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		onuID := c.Param("onu_id")

		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}
		if onuID == "" {
			response.BadRequest(c, "ONU ID is required")
			return
		}

		// Convert simplified ONU ID to full format
		onuID = normalizeONUID(onuID)

		var req service.ONUActionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		if err := onuSvc.PerformAction(deviceID, onuID, req.Action); err != nil {
			response.InternalError(c, err.Error())
			return
		}

		writeAuditLog(c, db, "onu.action."+strings.ToLower(req.Action), "onu", onuID, map[string]interface{}{
			"device_id": deviceID,
			"action":    req.Action,
		})
		response.SuccessWithMessage(c, "Action '"+req.Action+"' performed successfully", map[string]string{
			"device_id": deviceID,
			"onu_id":    onuID,
			"action":    req.Action,
		})
	}
}

// UpdateONU handles PUT /api/v1/devices/:id/onus/:onu_id
func UpdateONU(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		onuID := c.Param("onu_id")

		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}
		if onuID == "" {
			response.BadRequest(c, "ONU ID is required")
			return
		}

		// Convert simplified ONU ID to full format
		onuID = normalizeONUID(onuID)

		var req service.ONUUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		if err := onuSvc.UpdateONUName(deviceID, onuID, req.Name); err != nil {
			response.InternalError(c, err.Error())
			return
		}

		writeAuditLog(c, db, "onu.name.updated", "onu", onuID, map[string]interface{}{
			"device_id": deviceID,
			"name":      req.Name,
		})
		response.SuccessWithMessage(c, "ONU name updated successfully", map[string]string{
			"device_id": deviceID,
			"onu_id":    onuID,
			"name":      req.Name,
		})
	}
}

// DeleteONU handles DELETE /api/v1/devices/:device_id/onus/:onu_id
func DeleteONU(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := c.Param("id")
		onuID := c.Param("onu_id")

		if deviceID == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}
		if onuID == "" {
			response.BadRequest(c, "ONU ID is required")
			return
		}

		// Convert simplified ONU ID to full format
		onuID = normalizeONUID(onuID)

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		if err := onuSvc.DeleteONU(deviceID, onuID); err != nil {
			response.InternalError(c, err.Error())
			return
		}

		writeAuditLog(c, db, "onu.deleted", "onu", onuID, map[string]interface{}{
			"device_id": deviceID,
		})
		response.SuccessWithMessage(c, "ONU deleted successfully", nil)
	}
}

// SaveConfig handles POST /api/v1/devices/:id/save-config
func SaveConfig(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		if err := onuSvc.SaveConfig(id); err != nil {
			response.InternalError(c, err.Error())
			return
		}

		writeAuditLog(c, db, "device.config.saved", "device", id, nil)
		response.SuccessWithMessage(c, "Configuration saved successfully", nil)
	}
}

// GetLogs handles GET /api/v1/devices/:id/logs
func GetLogs(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, "Device ID is required")
			return
		}

		// Parse optional limit
		limit := 100 // default
		if l := c.Query("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		deviceSvc := service.NewDeviceService(db, cfg)
		onuSvc := service.NewONUService(db, cfg, deviceSvc)

		logs, err := onuSvc.GetLogs(id, limit)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, logs, id)
	}
}
