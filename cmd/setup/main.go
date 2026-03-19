package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/spf13/viper"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"jobmaster/internal/model"
	"jobmaster/pkg/database"
)

type Config struct {
	Database struct {
		Host     string `mapstructure:"host"`
		Port     int    `mapstructure:"port"`
		User     string `mapstructure:"user"`
		Password string `mapstructure:"password"`
		DBName   string `mapstructure:"dbname"`
		SSLMode  string `mapstructure:"sslmode"`
	} `mapstructure:"database"`

	Setup struct {
		OwnerEmail    string `mapstructure:"owner_email"`
		OwnerPassword string `mapstructure:"owner_password"`
		OwnerName     string `mapstructure:"owner_name"`
		TenantName    string `mapstructure:"tenant_name"`
		OrgName       string `mapstructure:"org_name"`
	} `mapstructure:"setup"`
}

func main() {
	interactive := flag.Bool("i", false, "Interactive mode")
	flag.Parse()

	config, err := loadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := initDatabase(config)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if *interactive {
		runInteractiveSetup(db)
	} else {
		runAutomatedSetup(db, config)
	}

	log.Println("Setup completed successfully")
}

func loadConfig() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "jobmaster")
	viper.SetDefault("database.dbname", "jobmaster")
	viper.SetDefault("database.sslmode", "disable")

	viper.SetEnvPrefix("JOBMASTER")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

func initDatabase(config *Config) (*gorm.DB, error) {
	dbConfig := &database.Config{
		Host:     config.Database.Host,
		Port:     fmt.Sprintf("%d", config.Database.Port),
		User:     config.Database.User,
		Password: config.Database.Password,
		Database: config.Database.DBName,
		SSLMode:  config.Database.SSLMode,
	}

	db, err := database.InitDBWithLogLevel(dbConfig, "warn")
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	log.Println("Database connection established")
	return db, nil
}

func runInteractiveSetup(db *gorm.DB) {
	scanner := bufio.NewScanner(os.Stdin)

	fmt.Print("Tenant Name (default: Default Tenant): ")
	var tenantName string
	if scanner.Scan() {
		tenantName = scanner.Text()
	}
	if tenantName == "" {
		tenantName = "Default Tenant"
	}

	fmt.Print("Organization Name (default: HQ): ")
	var orgName string
	if scanner.Scan() {
		orgName = scanner.Text()
	}
	if orgName == "" {
		orgName = "HQ"
	}

	fmt.Print("Owner Email: ")
	var email string
	if scanner.Scan() {
		email = scanner.Text()
	}

	fmt.Print("Owner Password: ")
	var password string
	if scanner.Scan() {
		password = scanner.Text()
	}

	fmt.Print("Owner Name (default: Admin): ")
	var name string
	if scanner.Scan() {
		name = scanner.Text()
	}
	if name == "" {
		name = "Admin"
	}

	executeSetup(db, tenantName, orgName, email, password, name)
}

func runAutomatedSetup(db *gorm.DB, config *Config) {
	tenantName := config.Setup.TenantName
	if tenantName == "" {
		tenantName = "Default Tenant"
	}

	orgName := config.Setup.OrgName
	if orgName == "" {
		orgName = "HQ"
	}

	email := config.Setup.OwnerEmail
	password := config.Setup.OwnerPassword
	name := config.Setup.OwnerName
	if name == "" {
		name = "Admin"
	}

	if email == "" || password == "" {
		log.Fatal("owner_email and owner_password are required in non-interactive mode")
	}

	executeSetup(db, tenantName, orgName, email, password, name)
}

func executeSetup(db *gorm.DB, tenantName, orgName, email, password, name string) {
	var existingTenant model.Tenant
	result := db.Where("name = ?", tenantName).First(&existingTenant)
	if result.Error == nil {
		log.Printf("Tenant '%s' already exists, skipping", tenantName)
		return
	}

	tenantID := uuid.New()
	slug := strings.ToLower(strings.ReplaceAll(tenantName, " ", "-"))
	code := strings.ToUpper(slug[:3]) + "-" + tenantID.String()[:8]

	tenant := model.Tenant{
		UUID:   tenantID,
		Name:   tenantName,
		Code:   code,
		Slug:   slug,
		Status: 1,
		Config: model.JSONBMap{
			"hop_limit": 5,
		},
	}
	if err := db.Create(&tenant).Error; err != nil {
		log.Fatalf("Failed to create tenant: %v", err)
	}
	log.Printf("Created tenant: %s (ID: %s)", tenantName, tenantID)

	orgID := uuid.New()
	org := model.Organization{
		ID:       orgID,
		TenantID: tenantID,
		Name:     orgName,
		Type:     model.OrgTypeHQ,
		Code:     strings.ToUpper(orgName[:3]) + "-" + tenantID.String()[:8],
		Level:    0,
	}
	if err := db.Create(&org).Error; err != nil {
		log.Fatalf("Failed to create organization: %v", err)
	}
	log.Printf("Created organization: %s (ID: %s)", orgName, orgID)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	user := model.User{
		ID:             uuid.New(),
		TenantID:       tenantID,
		OrganizationID: orgID,
		Username:       email,
		Email:          email,
		DisplayName:    name,
		PasswordHash:   string(hashedPassword),
		Role:           model.UserRoleBrandHQ,
		IsOrgOwner:     true,
		Status:         model.UserStatusActive,
	}
	if err := db.Create(&user).Error; err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}
	log.Printf("Created owner user: %s (ID: %s)", email, user.ID)

	fmt.Println("\n=== Setup Summary ===")
	fmt.Printf("Tenant: %s\n", tenantName)
	fmt.Printf("Organization: %s\n", orgName)
	fmt.Printf("Owner Email: %s\n", email)
	fmt.Printf("Owner Name: %s\n", name)
	fmt.Println("======================")
}
