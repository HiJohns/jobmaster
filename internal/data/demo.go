package data

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"gorm.io/gorm"
)

// DemoData represents the structure of the demo JSON file
type DemoData struct {
	Organizations json.RawMessage `json:"jm_organizations"`
	Reservations  json.RawMessage `json:"jm_reservations"`
	Tenants       json.RawMessage `json:"jm_tenants"`
	Users         json.RawMessage `json:"jm_users"`
	WorkRecords   json.RawMessage `json:"jm_work_records"`
	WorkOrders    json.RawMessage `json:"jm_workorders"`
	Session       json.RawMessage `json:"jm_session,omitempty"`
	MobileAuth    json.RawMessage `json:"mobile-auth-storage,omitempty"`
}

// LoadDemoData loads demo data from the file specified in DEMO_DUMMY_FILE env var
func LoadDemoData() (*DemoData, error) {
	filePath := os.Getenv("DEMO_DUMMY_FILE")
	if filePath == "" {
		// Try default path
		exePath, err := os.Executable()
		if err != nil {
			return nil, fmt.Errorf("failed to get executable path: %w", err)
		}
		filePath = filepath.Join(filepath.Dir(exePath), "demo.json")
	}

	data, err := os.ReadFile(filepath.Clean(filePath))
	if err != nil {
		return nil, fmt.Errorf("failed to read demo data file: %w", err)
	}

	var demoData DemoData
	if err := json.Unmarshal(data, &demoData); err != nil {
		return nil, fmt.Errorf("failed to parse demo data: %w", err)
	}

	return &demoData, nil
}

// IsDemoMode checks if the application is running in demo mode
func IsDemoMode() bool {
	return os.Getenv("DEMO_MODE") == "true"
}

// InitDemoData initializes the database with demo data
func InitDemoData(db *gorm.DB) error {
	if !IsDemoMode() {
		return nil
	}

	_, err := LoadDemoData()
	if err != nil {
		return fmt.Errorf("failed to load demo data: %w", err)
	}

	// TODO: Parse and insert data into database
	// This depends on the model structure

	return nil
}
