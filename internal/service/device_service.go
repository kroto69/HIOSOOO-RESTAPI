package service

import (
	"fmt"
	"time"

	"olt-api/internal/config"
	"olt-api/internal/database"
	"olt-api/internal/parser"
	"olt-api/internal/scraper"

	"gorm.io/gorm"
)

// DeviceService handles device-related business logic
type DeviceService struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewDeviceService creates a new DeviceService
func NewDeviceService(db *gorm.DB, cfg *config.Config) *DeviceService {
	return &DeviceService{
		db:  db,
		cfg: cfg,
	}
}

// Create creates a new device (Upsert: Create or Update)
func (s *DeviceService) Create(req *database.DeviceRequest) (*database.Device, error) {
	// Default port to 80 if not specified
	port := req.Port
	if port <= 0 {
		port = 80
	}

	device := &database.Device{
		ID:        req.ID,
		Name:      req.Name,
		BaseURL:   req.BaseURL,
		Port:      port,
		Username:  req.Username,
		Password:  req.Password,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Upsert: Save will create or update based on primary key
	if err := s.db.Save(device).Error; err != nil {
		return nil, fmt.Errorf("failed to save device: %w", err)
	}

	return device, nil
}

// GetAll returns all devices
func (s *DeviceService) GetAll() ([]database.Device, error) {
	var devices []database.Device
	if err := s.db.Find(&devices).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch devices: %w", err)
	}
	return devices, nil
}

// GetByID returns a device by ID
func (s *DeviceService) GetByID(id string) (*database.Device, error) {
	var device database.Device
	if err := s.db.Where("id = ?", id).First(&device).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("device '%s' not found", id)
		}
		return nil, fmt.Errorf("failed to fetch device: %w", err)
	}
	return &device, nil
}

// Update updates an existing device
func (s *DeviceService) Update(id string, req *database.DeviceUpdateRequest) (*database.Device, error) {
	device, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if req.Name != "" {
		device.Name = req.Name
	}
	if req.BaseURL != "" {
		device.BaseURL = req.BaseURL
	}
	if req.Port != nil && *req.Port > 0 {
		device.Port = *req.Port
	}
	if req.Username != "" {
		device.Username = req.Username
	}
	if req.Password != "" {
		device.Password = req.Password
	}
	if req.Status != "" {
		device.Status = req.Status
	}
	device.UpdatedAt = time.Now()

	if err := s.db.Save(device).Error; err != nil {
		return nil, fmt.Errorf("failed to update device: %w", err)
	}

	return device, nil
}

// Delete removes a device
func (s *DeviceService) Delete(id string) error {
	result := s.db.Where("id = ?", id).Delete(&database.Device{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete device: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("device '%s' not found", id)
	}
	return nil
}

// DeleteAll removes all devices
func (s *DeviceService) DeleteAll() error {
	return s.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&database.Device{}).Error
}

// CheckStatus checks if a device is reachable
func (s *DeviceService) CheckStatus(id string) (map[string]interface{}, error) {
	device, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	client := scraper.NewClient(device.BaseURL, device.Username, device.Password, s.cfg.Scraper.Timeout)

	status := map[string]interface{}{
		"device_id":  device.ID,
		"name":       device.Name,
		"base_url":   device.BaseURL,
		"reachable":  false,
		"checked_at": time.Now(),
	}

	if err := client.CheckConnection(); err != nil {
		status["error"] = err.Error()
		return status, nil
	}

	status["reachable"] = true
	return status, nil
}

// GetClient returns an HTTP client for a device
func (s *DeviceService) GetClient(deviceID string) (*scraper.Client, error) {
	device, err := s.GetByID(deviceID)
	if err != nil {
		return nil, err
	}

	// Build base URL with port
	baseURL := device.BaseURL
	if device.Port > 0 && device.Port != 80 {
		baseURL = fmt.Sprintf("%s:%d", device.BaseURL, device.Port)
	}

	return scraper.NewClient(baseURL, device.Username, device.Password, s.cfg.Scraper.Timeout), nil
}

// GetSystemInfo fetches system information from the OLT device
func (s *DeviceService) GetSystemInfo(deviceID string) (*parser.SystemInfoResponse, error) {
	client, err := s.GetClient(deviceID)
	if err != nil {
		return nil, err
	}

	// Fetch system info from OLT
	html, err := client.Get("/system.asp", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch system info: %w", err)
	}

	// Parse response
	p := parser.NewParser()
	sysInfo, err := p.ParseSystemInfo(html)
	if err != nil {
		return nil, fmt.Errorf("failed to parse system info: %w", err)
	}

	return sysInfo, nil
}
