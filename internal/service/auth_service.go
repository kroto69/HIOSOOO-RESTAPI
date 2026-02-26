package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"olt-api/internal/config"
	"olt-api/internal/database"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService handles user authentication and token generation.
type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

// AuthUser is a sanitized user payload for API responses.
type AuthUser struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// LoginResult contains JWT token and user identity.
type LoginResult struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
	User        AuthUser  `json:"user"`
}

// NewAuthService creates a new AuthService.
func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

// EnsureInitialAdmin creates initial admin account when no users exist.
func (s *AuthService) EnsureInitialAdmin() error {
	var count int64
	if err := s.db.Model(&database.User{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count users: %w", err)
	}
	if count > 0 {
		return nil
	}

	username := strings.TrimSpace(s.cfg.Auth.InitialUsername)
	if username == "" {
		username = "admin"
	}

	password := strings.TrimSpace(s.cfg.Auth.InitialPassword)
	generated := false
	if password == "" {
		secret, err := generateHexSecret(12)
		if err != nil {
			return fmt.Errorf("failed to generate initial password: %w", err)
		}
		password = secret
		generated = true
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash initial password: %w", err)
	}

	user := &database.User{
		Username:     username,
		PasswordHash: string(hash),
		Role:         "admin",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := s.db.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create initial admin: %w", err)
	}

	if generated {
		log.Printf("[AUTH] Initial admin created. username=%s password=%s", username, password)
	} else {
		log.Printf("[AUTH] Initial admin created. username=%s", username)
	}

	return nil
}

// Login validates credentials and returns signed token.
func (s *AuthService) Login(username, password string) (*LoginResult, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return nil, fmt.Errorf("username and password are required")
	}

	var user database.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid username or password")
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid username or password")
	}

	token, expiresAt, err := s.generateToken(&user)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresAt:   expiresAt,
		User:        toAuthUser(&user),
	}, nil
}

// GetUserByID returns sanitized user by ID.
func (s *AuthService) GetUserByID(userID uint) (*AuthUser, error) {
	var user database.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	result := toAuthUser(&user)
	return &result, nil
}

// ChangePassword rotates user password after checking current password.
func (s *AuthService) ChangePassword(userID uint, currentPassword, newPassword string) error {
	if len(strings.TrimSpace(newPassword)) < 8 {
		return fmt.Errorf("new password must be at least 8 characters")
	}

	var user database.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to fetch user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return fmt.Errorf("current password is invalid")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	user.PasswordHash = string(hash)
	user.UpdatedAt = time.Now()
	if err := s.db.Save(&user).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// ListUsers returns all users for admin settings page.
func (s *AuthService) ListUsers() ([]AuthUser, error) {
	var users []database.User
	if err := s.db.Order("username ASC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch users: %w", err)
	}

	result := make([]AuthUser, 0, len(users))
	for i := range users {
		result = append(result, toAuthUser(&users[i]))
	}
	return result, nil
}

// CreateUser creates a new dashboard user.
func (s *AuthService) CreateUser(username, password, role string) (*AuthUser, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, fmt.Errorf("username is required")
	}
	if len(strings.TrimSpace(password)) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}

	role = normalizeRole(role)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &database.User{
		Username:     username,
		PasswordHash: string(hash),
		Role:         role,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.Create(user).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, fmt.Errorf("username already exists")
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	result := toAuthUser(user)
	return &result, nil
}

// AdminResetPassword updates a target user password without old password verification.
func (s *AuthService) AdminResetPassword(targetUserID uint, newPassword string) error {
	if targetUserID == 0 {
		return fmt.Errorf("invalid user ID")
	}
	if len(strings.TrimSpace(newPassword)) < 8 {
		return fmt.Errorf("new password must be at least 8 characters")
	}

	var user database.User
	if err := s.db.First(&user, targetUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to fetch user: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	user.PasswordHash = string(hash)
	user.UpdatedAt = time.Now()
	if err := s.db.Save(&user).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func normalizeRole(input string) string {
	role := strings.ToLower(strings.TrimSpace(input))
	switch role {
	case "admin":
		return "admin"
	case "operator":
		return "operator"
	default:
		return "operator"
	}
}

func (s *AuthService) generateToken(user *database.User) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(s.cfg.Auth.AccessTokenTTL)
	claims := jwt.MapClaims{
		"sub":      strconv.FormatUint(uint64(user.ID), 10),
		"username": user.Username,
		"role":     user.Role,
		"iat":      now.Unix(),
		"exp":      expiresAt.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.cfg.Auth.JWTSecret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign token: %w", err)
	}
	return signed, expiresAt, nil
}

func toAuthUser(user *database.User) AuthUser {
	return AuthUser{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
	}
}

func generateHexSecret(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
