package database

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	db     *gorm.DB
	dbOnce sync.Once
	dbErr  error
)

// Config holds database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
	SSLMode  string
}

// NewConfigFromEnv creates Config from environment variables
func NewConfigFromEnv() *Config {
	return &Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "jobmaster"),
		Password: getEnv("DB_PASSWORD", ""),
		Database: getEnv("DB_NAME", "jobmaster"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// DSN returns the PostgreSQL connection string
func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		c.Host, c.User, c.Password, c.Database, c.Port, c.SSLMode)
}

// DSNHidden returns the DSN with password masked for logging
func (c *Config) DSNHidden() string {
	return fmt.Sprintf("host=%s user=%s password=*** dbname=%s port=%s sslmode=%s",
		c.Host, c.User, c.Database, c.Port, c.SSLMode)
}

// getLogMode returns the GORM log mode based on input or environment variable
func getLogMode(level string) logger.LogLevel {
	if level == "" {
		level = strings.ToLower(os.Getenv("DB_LOG_LEVEL"))
	} else {
		level = strings.ToLower(level)
	}
	switch level {
	case "silent":
		return logger.Silent
	case "warn":
		return logger.Warn
	case "info":
		return logger.Info
	default:
		return logger.Error
	}
}

// InitDB initializes the database connection with connection pooling
// Thread-safe, can be called multiple times but only executes once
func InitDB(config *Config) (*gorm.DB, error) {
	return InitDBWithLogLevel(config, "")
}

// InitDBWithLogLevel initializes the database with custom log level
func InitDBWithLogLevel(config *Config, logLevel string) (*gorm.DB, error) {
	dbOnce.Do(func() {
		if config == nil {
			config = NewConfigFromEnv()
		}

		dsn := config.DSN()

		dbInstance, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(getLogMode(logLevel)),
		})
		if err != nil {
			dbErr = fmt.Errorf("failed to connect to database: %w", err)
			return
		}

		sqlDB, err := dbInstance.DB()
		if err != nil {
			dbErr = fmt.Errorf("failed to get underlying sql.DB: %w", err)
			return
		}

		sqlDB.SetMaxOpenConns(25)
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetConnMaxLifetime(5 * time.Minute)
		sqlDB.SetConnMaxIdleTime(5 * time.Minute)

		db = dbInstance
	})

	if dbErr != nil {
		return nil, dbErr
	}
	return db, nil
}

// GetDB returns the global database instance
// Returns error if database not initialized
func GetDB() (*gorm.DB, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized, call InitDB first")
	}
	return db, nil
}

// Close closes the database connection
func Close() error {
	if db == nil {
		return nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}
	return sqlDB.Close()
}
