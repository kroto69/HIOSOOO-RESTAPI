package database

import "time"

// Device represents an OLT device
type Device struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	BaseURL   string    `gorm:"not null" json:"base_url"`
	Port      int       `gorm:"default:80" json:"port"`
	Username  string    `gorm:"not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"` // encrypted, never expose in JSON
	Status    string    `gorm:"default:active" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DeviceRequest is used for creating/updating devices
type DeviceRequest struct {
	ID       string `json:"id" binding:"required"`
	Name     string `json:"name" binding:"required"`
	BaseURL  string `json:"base_url" binding:"required"`
	Port     int    `json:"port"` // optional, defaults to 80
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// DeviceUpdateRequest is used for updating devices
type DeviceUpdateRequest struct {
	Name     string `json:"name"`
	BaseURL  string `json:"base_url"`
	Port     *int   `json:"port"` // pointer to detect if set
	Username string `json:"username"`
	Password string `json:"password"`
	Status   string `json:"status"`
}

// ONULog for historical tracking of ONU metrics
type ONULog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	DeviceID    string    `gorm:"index" json:"device_id"`
	ONUID       string    `gorm:"index" json:"onu_id"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	Temperature float64   `json:"temperature"`
	TxPower     float64   `json:"tx_power"`
	RxPower     float64   `json:"rx_power"`
	RecordedAt  time.Time `gorm:"index" json:"recorded_at"`
}

// CacheEntry for response caching
type CacheEntry struct {
	Key       string    `gorm:"primaryKey" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	ExpiresAt time.Time `gorm:"index" json:"expires_at"`
}

// IsExpired checks if the cache entry has expired
func (c *CacheEntry) IsExpired() bool {
	return time.Now().After(c.ExpiresAt)
}
