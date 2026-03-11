package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"

	"jobmaster/internal/api"
	dbseeder "jobmaster/internal/db"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
)

// Config holds the application configuration
type Config struct {
	Server struct {
		Port int    `mapstructure:"port"`
		Mode string `mapstructure:"mode"`
	} `mapstructure:"server"`

	Database struct {
		Host     string `mapstructure:"host"`
		Port     int    `mapstructure:"port"`
		User     string `mapstructure:"user"`
		Password string `mapstructure:"password"`
		DBName   string `mapstructure:"dbname"`
		SSLMode  string `mapstructure:"sslmode"`
	} `mapstructure:"database"`

	DBLogLevel string `mapstructure:"db_log_level"`

	JWT struct {
		Secret     string `mapstructure:"secret"`
		Expiration int    `mapstructure:"expiration"`
	} `mapstructure:"jwt"`

	Redis struct {
		Host     string `mapstructure:"host"`
		Port     int    `mapstructure:"port"`
		Password string `mapstructure:"password"`
		DB       int    `mapstructure:"db"`
	} `mapstructure:"redis"`
}

func main() {
	// Parse command line flags
	migrate := flag.Bool("migrate", false, "Run database migration and seed, then exit")
	flag.Parse()

	// Load configuration
	config, err := loadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Set Gin mode
	gin.SetMode(config.Server.Mode)

	// Initialize database
	if err := initDatabase(config); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Migration mode: run migration and seed, then exit
	if *migrate {
		log.Println("Running in migration mode...")

		// Run auto-migration
		if err := autoMigrate(); err != nil {
			log.Fatalf("Failed to auto-migrate: %v", err)
		}

		// Run database seeder
		if err := runSeeder(); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}

		log.Println("Migration completed successfully")
		os.Exit(0)
	}

	// Normal mode: skip migration for faster startup
	log.Println("Skipping migration in normal mode (use --migrate flag to run migration)")

	// Initialize JWT secret from config
	if config.JWT.Secret != "" {
		os.Setenv("JWT_SECRET", config.JWT.Secret)
	}

	// Setup router
	router := setupRouter(config)

	// Create HTTP server
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", config.Server.Port),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %d...", config.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	// Close database connection
	if err := database.Close(); err != nil {
		log.Printf("Failed to close database: %v", err)
	}

	log.Println("Server exited")
}

// loadConfig loads configuration from config.yaml and environment variables
func loadConfig() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	// Set defaults
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.mode", "debug")
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "jobmaster")
	viper.SetDefault("database.dbname", "jobmaster")
	viper.SetDefault("database.sslmode", "disable")
	viper.SetDefault("db_log_level", "info")
	viper.SetDefault("jwt.expiration", 86400)

	// Read environment variables
	viper.SetEnvPrefix("JOBMASTER")
	viper.AutomaticEnv()

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		log.Println("Config file not found, using defaults and environment variables")
	} else {
		log.Printf("Loaded config file: %s", viper.ConfigFileUsed())
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

// initDatabase initializes the database connection
func initDatabase(config *Config) error {
	// Create database config directly instead of using environment variables
	dbConfig := &database.Config{
		Host:     config.Database.Host,
		Port:     fmt.Sprintf("%d", config.Database.Port),
		User:     config.Database.User,
		Password: config.Database.Password,
		Database: config.Database.DBName,
		SSLMode:  config.Database.SSLMode,
	}

	_, err := database.InitDBWithLogLevel(dbConfig, config.DBLogLevel)
	if err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}

	log.Println("Database connection established")
	return nil
}

// autoMigrate runs GORM auto-migration for all models
func autoMigrate() error {
	db, err := database.GetDB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	log.Println("Running auto-migration...")

	// Migrate all models
	models := []interface{}{
		&model.User{},
		&model.Organization{},
		&model.Order{},
		&model.WorkOrder{},
	}

	for _, m := range models {
		if err := db.AutoMigrate(m); err != nil {
			return fmt.Errorf("failed to migrate %T: %w", m, err)
		}
	}

	log.Println("Auto-migration completed")
	return nil
}

// runSeeder runs the database seeder if needed
func runSeeder() error {
	db, err := database.GetDB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	seeder := dbseeder.NewSeeder(db)

	// Check if already seeded
	isSeeded, err := seeder.IsSeeded()
	if err != nil {
		return fmt.Errorf("failed to check seed status: %w", err)
	}

	if isSeeded {
		log.Println("Database already seeded, skipping")
		return nil
	}

	return seeder.SeedAll()
}

// setupRouter configures the Gin router
func setupRouter(config *Config) *gin.Engine {
	// Use the centralized router setup from internal/api package
	router := api.SetupRouter()
	return router
}
