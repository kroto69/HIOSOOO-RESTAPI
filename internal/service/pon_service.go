package service

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

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
	pons, err := s.fetchPONListWithFallback(client)
	if err != nil {
		return nil, err
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

	pons, err := s.fetchPONListWithFallback(client)
	if err != nil {
		return nil, err
	}

	// Cache result
	if s.cfg.Cache.Enabled && len(pons) > 0 {
		if data, err := json.Marshal(pons); err == nil {
			database.SetCache(s.db, cacheKey, string(data), s.cfg.Cache.TTL)
		}
	}

	return pons, nil
}

func (s *PONService) fetchPONListWithFallback(client *scraper.Client) ([]parser.PONResponse, error) {
	endpoints := []string{
		"/onuOverviewPonList.asp",
		"/onuConfigPonList.asp",
	}

	var errs []string
	for _, endpoint := range endpoints {
		html, reqErr := client.Get(endpoint, nil)
		if reqErr != nil {
			errs = append(errs, fmt.Sprintf("%s request failed: %v", endpoint, reqErr))
			continue
		}

		pons, parseErr := s.parser.ParsePONList(html)
		if parseErr != nil {
			errs = append(errs, fmt.Sprintf("%s parse failed: %v", endpoint, parseErr))
			continue
		}
		if len(pons) > 0 {
			return pons, nil
		}
		errs = append(errs, fmt.Sprintf("%s returned empty PON list", endpoint))
	}

	return nil, fmt.Errorf(strings.Join(errs, "; "))
}
