package response

import (
	"time"

	"github.com/gin-gonic/gin"
)

// Response is the standard API response format
type Response struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	DeviceID  string      `json:"device_id,omitempty"`
}

// PaginatedResponse includes pagination metadata
type PaginatedResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Total     int         `json:"total"`
	Page      int         `json:"page"`
	PageSize  int         `json:"page_size"`
	Timestamp time.Time   `json:"timestamp"`
	DeviceID  string      `json:"device_id,omitempty"`
}

// Success sends a successful response with data
func Success(c *gin.Context, data interface{}, deviceID string) {
	c.JSON(200, Response{
		Success:   true,
		Data:      data,
		DeviceID:  deviceID,
		Timestamp: time.Now(),
	})
}

// SuccessWithMessage sends a successful response with message and data
func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(200, Response{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
	})
}

// Created sends a 201 Created response
func Created(c *gin.Context, message string, data interface{}) {
	c.JSON(201, Response{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
	})
}

// Error sends an error response
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, Response{
		Success:   false,
		Error:     message,
		Timestamp: time.Now(),
	})
}

// BadRequest sends a 400 Bad Request response
func BadRequest(c *gin.Context, message string) {
	Error(c, 400, message)
}

// NotFound sends a 404 Not Found response
func NotFound(c *gin.Context, message string) {
	Error(c, 404, message)
}

// InternalError sends a 500 Internal Server Error response
func InternalError(c *gin.Context, message string) {
	Error(c, 500, message)
}

// Paginated sends a paginated response
func Paginated(c *gin.Context, data interface{}, total, page, pageSize int, deviceID string) {
	c.JSON(200, PaginatedResponse{
		Success:   true,
		Data:      data,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
		DeviceID:  deviceID,
		Timestamp: time.Now(),
	})
}
