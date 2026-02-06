package handlers

import (
	"olt-api/pkg/response"

	"github.com/gin-gonic/gin"
)

// Health returns a health check response
func Health(c *gin.Context) {
	response.SuccessWithMessage(c, "OK", map[string]interface{}{
		"status":  "healthy",
		"service": "olt-api",
		"version": "1.0.0",
	})
}
