package handlers

import (
	"strconv"
	"strings"

	"olt-api/internal/config"
	"olt-api/internal/database"
	"olt-api/internal/middleware"
	"olt-api/internal/service"
	"olt-api/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func requireAdmin(c *gin.Context) bool {
	roleValue, ok := c.Get(middleware.ContextRole)
	if !ok {
		response.Error(c, 403, "forbidden")
		return false
	}

	role, ok := roleValue.(string)
	if !ok || strings.ToLower(strings.TrimSpace(role)) != "admin" {
		response.Error(c, 403, "admin role required")
		return false
	}

	return true
}

// Login handles POST /api/v1/auth/login
func Login(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req database.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		authSvc := service.NewAuthService(db, cfg)
		result, err := authSvc.Login(strings.TrimSpace(req.Username), req.Password)
		if err != nil {
			response.Error(c, 401, err.Error())
			return
		}

		response.SuccessWithMessage(c, "Login successful", result)
	}
}

// Me handles GET /api/v1/auth/me
func Me(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDValue, ok := c.Get(middleware.ContextUserID)
		if !ok {
			response.Error(c, 401, "unauthorized")
			return
		}

		userID, ok := userIDValue.(uint)
		if !ok || userID == 0 {
			response.Error(c, 401, "invalid auth context")
			return
		}

		authSvc := service.NewAuthService(db, cfg)
		user, err := authSvc.GetUserByID(userID)
		if err != nil {
			response.NotFound(c, err.Error())
			return
		}

		response.Success(c, user, "")
	}
}

// ChangePassword handles POST /api/v1/auth/change-password
func ChangePassword(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDValue, ok := c.Get(middleware.ContextUserID)
		if !ok {
			response.Error(c, 401, "unauthorized")
			return
		}

		userID, ok := userIDValue.(uint)
		if !ok || userID == 0 {
			response.Error(c, 401, "invalid auth context")
			return
		}

		var req database.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		authSvc := service.NewAuthService(db, cfg)
		if err := authSvc.ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
			response.BadRequest(c, err.Error())
			return
		}

		response.SuccessWithMessage(c, "Password updated successfully", nil)
	}
}

// ListUsers handles GET /api/v1/auth/users
func ListUsers(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !requireAdmin(c) {
			c.Abort()
			return
		}

		authSvc := service.NewAuthService(db, cfg)
		users, err := authSvc.ListUsers()
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, users, "")
	}
}

// CreateUser handles POST /api/v1/auth/users
func CreateUser(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !requireAdmin(c) {
			c.Abort()
			return
		}

		var req database.CreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		authSvc := service.NewAuthService(db, cfg)
		user, err := authSvc.CreateUser(req.Username, req.Password, req.Role)
		if err != nil {
			response.BadRequest(c, err.Error())
			return
		}

		response.Created(c, "User created successfully", user)
	}
}

// ResetUserPassword handles PUT /api/v1/auth/users/:id/password
func ResetUserPassword(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !requireAdmin(c) {
			c.Abort()
			return
		}

		idRaw := c.Param("id")
		idValue, err := strconv.ParseUint(strings.TrimSpace(idRaw), 10, 64)
		if err != nil || idValue == 0 {
			response.BadRequest(c, "Invalid user ID")
			return
		}

		var req database.ResetUserPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.BadRequest(c, "Invalid request: "+err.Error())
			return
		}

		authSvc := service.NewAuthService(db, cfg)
		if err := authSvc.AdminResetPassword(uint(idValue), req.NewPassword); err != nil {
			response.BadRequest(c, err.Error())
			return
		}

		response.SuccessWithMessage(c, "Password updated successfully", nil)
	}
}
