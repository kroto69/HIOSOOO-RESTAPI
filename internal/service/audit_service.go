package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"olt-api/internal/database"

	"gorm.io/gorm"
)

// AuditService manages user activity logs.
type AuditService struct {
	db *gorm.DB
}

// AuditLogEntry is the payload for a single activity entry.
type AuditLogEntry struct {
	UserID     uint
	Username   string
	Role       string
	Action     string
	Resource   string
	ResourceID string
	Metadata   map[string]interface{}
	IPAddress  string
	UserAgent  string
}

// AuditLogFilter controls list query behavior.
type AuditLogFilter struct {
	Limit    int
	UserID   uint
	Username string
	Action   string
	Resource string
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// Log stores one activity entry.
func (s *AuditService) Log(entry AuditLogEntry) error {
	action := strings.TrimSpace(entry.Action)
	resource := strings.TrimSpace(entry.Resource)
	username := strings.TrimSpace(entry.Username)

	if action == "" {
		return fmt.Errorf("action is required")
	}
	if resource == "" {
		resource = "system"
	}
	if username == "" {
		username = "anonymous"
	}

	metadataJSON := ""
	if len(entry.Metadata) > 0 {
		raw, err := json.Marshal(entry.Metadata)
		if err != nil {
			return fmt.Errorf("failed to encode audit metadata: %w", err)
		}
		metadataJSON = string(raw)
	}

	record := &database.AuditLog{
		UserID:     entry.UserID,
		Username:   username,
		Role:       strings.TrimSpace(entry.Role),
		Action:     action,
		Resource:   resource,
		ResourceID: strings.TrimSpace(entry.ResourceID),
		Metadata:   metadataJSON,
		IPAddress:  strings.TrimSpace(entry.IPAddress),
		UserAgent:  strings.TrimSpace(entry.UserAgent),
		CreatedAt:  time.Now(),
	}

	return s.db.Create(record).Error
}

// List returns recent activity logs.
func (s *AuditService) List(filter AuditLogFilter) ([]database.AuditLog, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 25
	}
	if limit > 25 {
		limit = 25
	}

	query := s.db.Model(&database.AuditLog{}).Order("created_at DESC").Limit(limit)
	if filter.UserID > 0 {
		query = query.Where("user_id = ?", filter.UserID)
	}
	if trimmed := strings.TrimSpace(filter.Username); trimmed != "" {
		query = query.Where("LOWER(username) = ?", strings.ToLower(trimmed))
	}
	if trimmed := strings.TrimSpace(filter.Action); trimmed != "" {
		query = query.Where("LOWER(action) = ?", strings.ToLower(trimmed))
	}
	if trimmed := strings.TrimSpace(filter.Resource); trimmed != "" {
		query = query.Where("LOWER(resource) = ?", strings.ToLower(trimmed))
	}

	var logs []database.AuditLog
	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %w", err)
	}
	return logs, nil
}
