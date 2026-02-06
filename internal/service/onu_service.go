package service

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"olt-api/internal/config"
	"olt-api/internal/database"
	"olt-api/internal/parser"
	"olt-api/internal/scraper"

	"gorm.io/gorm"
)

// ONUService handles ONU-related business logic
type ONUService struct {
	db            *gorm.DB
	cfg           *config.Config
	deviceService *DeviceService
	parser        *parser.Parser
}

// NewONUService creates a new ONUService
func NewONUService(db *gorm.DB, cfg *config.Config, deviceService *DeviceService) *ONUService {
	return &ONUService{
		db:            db,
		cfg:           cfg,
		deviceService: deviceService,
		parser:        parser.NewParser(),
	}
}

// GetONUsByPON retrieves ONUs for a specific PON port
func (s *ONUService) GetONUsByPON(deviceID, ponID string, filter string) ([]parser.ONUResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("onus:%s:%s", deviceID, ponID)
	if s.cfg.Cache.Enabled {
		if cached, ok := database.GetCache(s.db, cacheKey); ok {
			var onus []parser.ONUResponse
			if err := json.Unmarshal([]byte(cached), &onus); err == nil {
				log.Printf("[ONU] Cache hit for device %s PON %s", deviceID, ponID)
				return s.filterONUs(onus, filter), nil
			}
		}
	}

	// Get client for device
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return nil, err
	}

	// Fetch ONU list from OLT
	html, err := client.Get("/onuOverview.asp", map[string]string{
		"oltponno": ponID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ONU list: %w", err)
	}

	// Parse response
	onus, err := s.parser.ParseONUList(html)
	if err != nil {
		return nil, fmt.Errorf("failed to parse ONU list: %w", err)
	}

	// Cache result
	if s.cfg.Cache.Enabled && len(onus) > 0 {
		if data, err := json.Marshal(onus); err == nil {
			database.SetCache(s.db, cacheKey, string(data), s.cfg.Cache.TTL)
		}
	}

	// Log ONU data for history
	go s.logONUs(deviceID, onus)

	log.Printf("[ONU] Fetched %d ONUs from device %s PON %s", len(onus), deviceID, ponID)
	return s.filterONUs(onus, filter), nil
}

// GetONUDetail retrieves detailed information for a specific ONU
func (s *ONUService) GetONUDetail(deviceID, onuID string) (*parser.ONUDetailResponse, error) {
	// Parse ONU ID to get PON and ONU number
	// Format: "0/1:8" -> oltponno=0/1, onuno=8
	parts := strings.Split(onuID, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid ONU ID format: %s (expected format: PON:ONU, e.g., 0/1:8)", onuID)
	}

	ponNo := parts[0]
	// Note: We use full onuID in the request, not just the ONU number

	// Check cache
	cacheKey := fmt.Sprintf("onu-detail:%s:%s", deviceID, onuID)
	if s.cfg.Cache.Enabled {
		if cached, ok := database.GetCache(s.db, cacheKey); ok {
			var detail parser.ONUDetailResponse
			if err := json.Unmarshal([]byte(cached), &detail); err == nil {
				return &detail, nil
			}
		}
	}

	// Get client for device
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return nil, err
	}

	// Fetch ONU detail from OLT
	// Endpoint: /onuConfig.asp?onuno=0/1:4&oltponno=0/1
	html, err := client.Get("/onuConfig.asp", map[string]string{
		"oltponno": ponNo,
		"onuno":    onuID, // Pass full ONU ID (e.g., "0/1:4")
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ONU detail: %w", err)
	}

	// Parse response
	detail, err := s.parser.ParseONUDetail(html)
	if err != nil {
		return nil, fmt.Errorf("failed to parse ONU detail: %w", err)
	}

	// Cache result
	if s.cfg.Cache.Enabled {
		if data, err := json.Marshal(detail); err == nil {
			database.SetCache(s.db, cacheKey, string(data), s.cfg.Cache.TTL)
		}
	}

	return detail, nil
}

// ONUUpdateRequest is used for updating ONU properties
type ONUUpdateRequest struct {
	Name string `json:"name" binding:"required"`
}

// UpdateONUName updates the name of an ONU
func (s *ONUService) UpdateONUName(deviceID, onuID, newName string) error {
	// Parse ONU ID to get PON number
	parts := strings.Split(onuID, ":")
	if len(parts) != 2 {
		return fmt.Errorf("invalid ONU ID format: %s", onuID)
	}

	// Get client for device
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return err
	}

	// Submit form to /goform/setOnu with onuOperation: nonOp
	// Added oltponno just in case it's required
	respBody, err := client.Post("/goform/setOnu", map[string]string{
		"oltponno":     parts[0], // Add PON number (e.g., "0/1")
		"onuId":        onuID,
		"onuName":      newName,
		"onuOperation": "nonOp",
	})
	if err != nil {
		return fmt.Errorf("failed to update ONU name: %w", err)
	}

	// Log response for debugging
	log.Printf("[ONU] Update name response for %s: %s", onuID, respBody)

	// Invalidate cache
	ponNo := parts[0]
	cacheKey := fmt.Sprintf("onus:%s:%s", deviceID, ponNo)
	s.db.Where("key = ?", cacheKey).Delete(&database.CacheEntry{})

	detailCacheKey := fmt.Sprintf("onu-detail:%s:%s", deviceID, onuID)
	s.db.Where("key = ?", detailCacheKey).Delete(&database.CacheEntry{})

	log.Printf("[ONU] Updated name for device %s ONU %s to '%s'", deviceID, onuID, newName)
	return nil
}

// ONUAction performs an action on an ONU (reboot, deregister, etc.)
type ONUActionRequest struct {
	Action string `json:"action" binding:"required"` // reboot, activate, deactivate, factory
}

// PerformAction executes an action on an ONU
// All actions use POST /goform/setOnu with onuOperation field
func (s *ONUService) PerformAction(deviceID, onuID string, action string) error {
	// Parse ONU ID to get PON number for cache invalidation
	parts := strings.Split(onuID, ":")
	if len(parts) != 2 {
		return fmt.Errorf("invalid ONU ID format: %s", onuID)
	}
	ponNo := parts[0]

	// Map action to onuOperation value
	var onuOperation string
	switch strings.ToLower(action) {
	case "reboot":
		onuOperation = "rebootOp"
	case "activate":
		onuOperation = "activeOp"
	case "deactivate":
		onuOperation = "noactiveOp"
	case "factory":
		onuOperation = "restoreOp"
	case "cleanloop":
		onuOperation = "cleanLoopOp"
	default:
		return fmt.Errorf("unsupported action: %s (supported: reboot, activate, deactivate, factory, cleanloop)", action)
	}

	// Get current ONU detail to preserve the name
	detail, err := s.GetONUDetail(deviceID, onuID)
	if err != nil {
		return fmt.Errorf("failed to get ONU detail: %w", err)
	}

	currentName := detail.Name
	if currentName == "" || currentName == "NA" {
		currentName = "ONU" // Fallback name
	}

	// Get client for device
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return err
	}

	// Submit form to /goform/setOnu with current name preserved
	_, err = client.Post("/goform/setOnu", map[string]string{
		"onuId":        onuID,
		"onuName":      currentName,
		"onuOperation": onuOperation,
	})
	if err != nil {
		return fmt.Errorf("failed to perform %s: %w", action, err)
	}

	// Invalidate cache
	cacheKey := fmt.Sprintf("onus:%s:%s", deviceID, ponNo)
	s.db.Where("key = ?", cacheKey).Delete(&database.CacheEntry{})

	detailCacheKey := fmt.Sprintf("onu-detail:%s:%s", deviceID, onuID)
	s.db.Where("key = ?", detailCacheKey).Delete(&database.CacheEntry{})

	log.Printf("[ONU] Performed %s on device %s ONU %s (preserved name: %s)", action, deviceID, onuID, currentName)
	return nil
}

// DeleteONU removes an ONU from the OLT
func (s *ONUService) DeleteONU(deviceID, onuID string) error {
	// Parse ONU ID to get PON number for cache invalidation
	parts := strings.Split(onuID, ":")
	if len(parts) != 2 {
		return fmt.Errorf("invalid ONU ID format: %s", onuID)
	}
	ponNo := parts[0]
	onuNum := parts[1]

	// Get client for device
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return err
	}

	// Delete ONU using /goform/deleteOnu
	// Payload: chkXX=on, onuId=0/1:XX (where XX is the ONU number)
	_, err = client.Post("/goform/deleteOnu", map[string]string{
		"chk" + onuNum: "on",
		"onuId":        onuID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete ONU: %w", err)
	}

	// Invalidate cache
	cacheKey := fmt.Sprintf("onus:%s:%s", deviceID, ponNo)
	s.db.Where("key = ?", cacheKey).Delete(&database.CacheEntry{})

	detailCacheKey := fmt.Sprintf("onu-detail:%s:%s", deviceID, onuID)
	s.db.Where("key = ?", detailCacheKey).Delete(&database.CacheEntry{})

	log.Printf("[ONU] Deleted ONU %s from device %s", onuID, deviceID)
	return nil
}

// GetAllONUs retrieves all ONUs across all PON ports for a device
func (s *ONUService) GetAllONUs(deviceID string, filter string) ([]parser.ONUResponse, error) {
	// Get PON list first
	ponService := NewPONService(s.db, s.cfg, s.deviceService)
	pons, err := ponService.GetPONList(deviceID)
	if err != nil {
		return nil, err
	}

	// Get client
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return nil, err
	}

	// Create worker pool for concurrent fetching
	pool := scraper.NewWorkerPool(s.cfg.Scraper.MaxWorkers)
	defer pool.Close()

	var allONUs []parser.ONUResponse
	var mu sync.Mutex

	// Fetch ONUs from each PON port concurrently
	for _, pon := range pons {
		ponID := pon.PONID
		pool.Submit(func() {
			html, err := client.Get("/onuOverview.asp", map[string]string{
				"oltponno": ponID,
			})
			if err != nil {
				log.Printf("[ONU] Failed to fetch ONUs from PON %s: %v", ponID, err)
				return
			}

			onus, err := s.parser.ParseONUList(html)
			if err != nil {
				log.Printf("[ONU] Failed to parse ONUs from PON %s: %v", ponID, err)
				return
			}

			mu.Lock()
			allONUs = append(allONUs, onus...)
			mu.Unlock()
		})
	}

	pool.Wait()

	log.Printf("[ONU] Fetched %d total ONUs from device %s", len(allONUs), deviceID)
	return s.filterONUs(allONUs, filter), nil
}

// filterONUs filters ONUs based on status
func (s *ONUService) filterONUs(onus []parser.ONUResponse, filter string) []parser.ONUResponse {
	if filter == "" {
		return onus
	}

	filter = strings.ToLower(filter)
	var filtered []parser.ONUResponse
	for _, onu := range onus {
		if strings.ToLower(onu.Status) == filter {
			filtered = append(filtered, onu)
		}
	}
	return filtered
}

// logONUs saves ONU data to history log
func (s *ONUService) logONUs(deviceID string, onus []parser.ONUResponse) {
	for _, onu := range onus {
		log := database.ONULog{
			DeviceID:    deviceID,
			ONUID:       onu.ONUID,
			Name:        onu.Name,
			Status:      onu.Status,
			Temperature: onu.Metrics.Temperature,
			TxPower:     onu.Metrics.TxPower,
			RxPower:     onu.Metrics.RxPower,
			RecordedAt:  time.Now(),
		}
		s.db.Create(&log)
	}
}

// SaveConfig saves the OLT configuration
func (s *ONUService) SaveConfig(deviceID string) error {
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return err
	}

	_, err = client.Post("/saveConfig.asp", nil)
	if err != nil {
		return fmt.Errorf("failed to save config: %w", err)
	}

	log.Printf("[ONU] Saved config on device %s", deviceID)
	return nil
}

// GetLogs retrieves recent ONU logs for a device
func (s *ONUService) GetLogs(deviceID string, limit int) ([]database.ONULog, error) {
	if limit <= 0 {
		limit = 100
	}

	var logs []database.ONULog
	if err := s.db.Where("device_id = ?", deviceID).Order("recorded_at DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch logs: %w", err)
	}

	return logs, nil
}
