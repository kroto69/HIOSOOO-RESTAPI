package database

import (
	"log"
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
var DB *gorm.DB

// Init initializes the database connection and runs migrations
func Init(dbPath string) (*gorm.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, err
		}
	}

	// Configure GORM logger
	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
		},
	)

	// Open database
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, err
	}

	// Run migrations
	if err := db.AutoMigrate(&Device{}, &ONULog{}, &CacheEntry{}); err != nil {
		return nil, err
	}

	DB = db
	log.Printf("Database initialized at %s", dbPath)
	return db, nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// CleanExpiredCache removes expired cache entries
func CleanExpiredCache(db *gorm.DB) error {
	return db.Where("expires_at < ?", time.Now()).Delete(&CacheEntry{}).Error
}

// GetCache retrieves a cache entry if it exists and is not expired
func GetCache(db *gorm.DB, key string) (string, bool) {
	var entry CacheEntry
	if err := db.Where("key = ?", key).First(&entry).Error; err != nil {
		return "", false
	}
	if entry.IsExpired() {
		db.Delete(&entry)
		return "", false
	}
	return entry.Value, true
}

// SetCache stores a value in the cache
func SetCache(db *gorm.DB, key, value string, ttl time.Duration) error {
	entry := CacheEntry{
		Key:       key,
		Value:     value,
		ExpiresAt: time.Now().Add(ttl),
	}
	return db.Save(&entry).Error
}
