package config

import (
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Cache    CacheConfig    `mapstructure:"cache"`
	Scraper  ScraperConfig  `mapstructure:"scraper"`
	Logging  LoggingConfig  `mapstructure:"logging"`
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Port         int           `mapstructure:"port"`
	Host         string        `mapstructure:"host"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

// DatabaseConfig holds database-related configuration
type DatabaseConfig struct {
	Path string `mapstructure:"path"`
}

// CacheConfig holds cache-related configuration
type CacheConfig struct {
	Enabled bool          `mapstructure:"enabled"`
	TTL     time.Duration `mapstructure:"ttl"`
}

// ScraperConfig holds scraper-related configuration
type ScraperConfig struct {
	Timeout       time.Duration `mapstructure:"timeout"`
	MaxWorkers    int           `mapstructure:"max_workers"`
	RetryAttempts int           `mapstructure:"retry_attempts"`
}

// LoggingConfig holds logging-related configuration
type LoggingConfig struct {
	Level string `mapstructure:"level"`
	File  string `mapstructure:"file"`
}

// Load reads configuration from file and environment variables
func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")

	// Set defaults
	viper.SetDefault("server.port", 3000)
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.read_timeout", "30s")
	viper.SetDefault("server.write_timeout", "30s")
	viper.SetDefault("database.path", "./olt-api.db")
	viper.SetDefault("cache.enabled", true)
	viper.SetDefault("cache.ttl", "60s")
	viper.SetDefault("scraper.timeout", "60s")
	viper.SetDefault("scraper.max_workers", 200)
	viper.SetDefault("scraper.retry_attempts", 3)
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.file", "./logs/app.log")

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		// Config file not found is not fatal, we have defaults
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	// Allow environment variable override
	viper.AutomaticEnv()

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
