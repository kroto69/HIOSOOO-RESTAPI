package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger returns a middleware function that logs requests
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get status code
		statusCode := c.Writer.Status()

		// Log format
		if query != "" {
			path = path + "?" + query
		}

		log.Printf("[%s] %d | %v | %s %s",
			time.Now().Format("2006/01/02 15:04:05"),
			statusCode,
			latency,
			c.Request.Method,
			path,
		)
	}
}

// Recovery returns a middleware that recovers from panics
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC] %v", err)
				c.AbortWithStatusJSON(500, gin.H{
					"success": false,
					"error":   "Internal Server Error",
				})
			}
		}()
		c.Next()
	}
}
