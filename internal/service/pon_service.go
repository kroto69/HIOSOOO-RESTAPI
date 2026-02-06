package service

import (
	"encoding/json"
	"fmt"
	"log"

	"olt-api/internal/config"
	"olt-api/internal/database"
	"olt-api/internal/parser"
	"olt-api/internal/scraper"

	"gorm.io/gorm"
)

// PONService handles PON-related business logic
type PONService struct {
	db            *gorm.DB
	cfg           *config.Config
	deviceService *DeviceService
	parser        *parser.Parser
}

// NewPONService creates a new PONService
func NewPONService(db *gorm.DB, cfg *config.Config, deviceService *DeviceService) *PONService {
	return &PONService{
		db:            db,
		cfg:           cfg,
		deviceService: deviceService,
		parser:        parser.NewParser(),
	}
}

// GetPONList retrieves the list of PON ports for a device
func (s *PONService) GetPONList(deviceID string) ([]parser.PONResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("pons:%s", deviceID)
	if s.cfg.Cache.Enabled {
		if cached, ok := database.GetCache(s.db, cacheKey); ok {
			var pons []parser.PONResponse
			if err := json.Unmarshal([]byte(cached), &pons); err == nil {
				log.Printf("[PON] Cache hit for device %s", deviceID)
				return pons, nil
			}
		}
	}

	// Get client for device
	client, err := s.deviceService.GetClient(deviceID)
	if err != nil {
		return nil, err
	}

	// Fetch PON list from OLT
	html, err := client.Get("/onuOverviewPonList.asp", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch PON list: %w", err)
	}

	// Parse response
	pons, err := s.parser.ParsePONList(html)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PON list: %w", err)
	}

	// Cache result
	if s.cfg.Cache.Enabled && len(pons) > 0 {
		if data, err := json.Marshal(pons); err == nil {
			database.SetCache(s.db, cacheKey, string(data), s.cfg.Cache.TTL)
		}
	}

	log.Printf("[PON] Fetched %d PON ports from device %s", len(pons), deviceID)
	return pons, nil
}

// GetPONListWithClients retrieves PON list using a provided client (for concurrent operations)
func (s *PONService) GetPONListWithClient(client *scraper.Client, deviceID string) ([]parser.PONResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("pons:%s", deviceID)
	if s.cfg.Cache.Enabled {
		if cached, ok := database.GetCache(s.db, cacheKey); ok {
			var pons []parser.PONResponse
			if err := json.Unmarshal([]byte(cached), &pons); err == nil {
				return pons, nil
			}
		}
	}

	// Fetch PON list from OLT
	html, err := client.Get("/onuOverviewPonList.asp", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch PON list: %w", err)
	}

	// Parse response
	pons, err := s.parser.ParsePONList(html)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PON list: %w", err)
	}

	// Cache result
	if s.cfg.Cache.Enabled && len(pons) > 0 {
		if data, err := json.Marshal(pons); err == nil {
			database.SetCache(s.db, cacheKey, string(data), s.cfg.Cache.TTL)
		}
	}

	return pons, nil
}
