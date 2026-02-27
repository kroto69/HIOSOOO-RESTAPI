package handlers

import (
	"strconv"
	"strings"

	"olt-api/internal/config"
	"olt-api/internal/service"
	"olt-api/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ListAuditLogs handles GET /api/v1/audit-logs
func ListAuditLogs(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		_ = cfg

		if !requireAdmin(c) {
			c.Abort()
			return
		}

		limit := 25
		if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed <= 0 {
				response.BadRequest(c, "Invalid limit")
				return
			}
			if parsed > 25 {
				parsed = 25
			}
			limit = parsed
		}

		var userID uint
		if raw := strings.TrimSpace(c.Query("user_id")); raw != "" {
			parsed, err := strconv.ParseUint(raw, 10, 64)
			if err != nil || parsed == 0 {
				response.BadRequest(c, "Invalid user_id")
				return
			}
			userID = uint(parsed)
		}

		filter := service.AuditLogFilter{
			Limit:    limit,
			UserID:   userID,
			Username: strings.TrimSpace(c.Query("username")),
			Action:   strings.TrimSpace(c.Query("action")),
			Resource: strings.TrimSpace(c.Query("resource")),
		}

		auditSvc := service.NewAuditService(db)
		logs, err := auditSvc.List(filter)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, logs, "")
	}
}
