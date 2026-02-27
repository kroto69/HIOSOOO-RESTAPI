package handlers

import (
	"log"
	"strings"

	"olt-api/internal/middleware"
	"olt-api/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func actorFromContext(c *gin.Context) (uint, string, string) {
	var userID uint
	if rawID, ok := c.Get(middleware.ContextUserID); ok {
		if parsedID, ok := rawID.(uint); ok {
			userID = parsedID
		}
	}

	username := "anonymous"
	if rawUsername, ok := c.Get(middleware.ContextUsername); ok {
		if parsedUsername, ok := rawUsername.(string); ok && strings.TrimSpace(parsedUsername) != "" {
			username = strings.TrimSpace(parsedUsername)
		}
	}

	role := ""
	if rawRole, ok := c.Get(middleware.ContextRole); ok {
		if parsedRole, ok := rawRole.(string); ok {
			role = strings.TrimSpace(parsedRole)
		}
	}

	return userID, username, role
}

func writeAuditLog(
	c *gin.Context,
	db *gorm.DB,
	action string,
	resource string,
	resourceID string,
	metadata map[string]interface{},
) {
	userID, username, role := actorFromContext(c)
	entry := service.AuditLogEntry{
		UserID:     userID,
		Username:   username,
		Role:       role,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Metadata:   metadata,
		IPAddress:  c.ClientIP(),
		UserAgent:  c.GetHeader("User-Agent"),
	}

	auditSvc := service.NewAuditService(db)
	if err := auditSvc.Log(entry); err != nil {
		log.Printf("[AUDIT] failed to write log action=%s resource=%s resource_id=%s: %v", action, resource, resourceID, err)
	}
}

