package httptest

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"jobmaster/internal/api"
	"jobmaster/internal/db"
	"jobmaster/pkg/database"
)

var (
	testRouter  *gin.Engine
	testDB      *gorm.DB
	dbAvailable bool
)

// TestMain initializes the test environment
func TestMain(m *testing.M) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Setup database connection for tests
	dbAvailable = setupTestDB()

	// Only create test router if database is available
	if dbAvailable {
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Recovered from panic during router setup: %v", r)
					dbAvailable = false
					testRouter = nil
				}
			}()
			testRouter = api.SetupRouter()
		}()
	}

	// Run tests
	code := m.Run()

	// Cleanup
	teardownTestDB()

	os.Exit(code)
}

// setupTestDB initializes database connection for testing
// Returns true if database is available, false otherwise
func setupTestDB() bool {
	// Use test database configuration
	config := &database.Config{
		Host:     getEnv("TEST_DB_HOST", "localhost"),
		Port:     getEnv("TEST_DB_PORT", "5432"),
		User:     getEnv("TEST_DB_USER", "jobmaster"),
		Password: getEnv("TEST_DB_PASSWORD", "jobmaster_dev_password"),
		Database: getEnv("TEST_DB_NAME", "jobmaster"),
		SSLMode:  getEnv("TEST_DB_SSLMODE", "disable"),
	}

	dbConn, err := database.InitDB(config)
	if err != nil {
		log.Printf("Warning: failed to connect to test database: %v (tests requiring DB will be skipped)", err)
		return false
	}
	testDB = dbConn

	// For integration flow test, we need to ensure fresh seed data
	// Check if we should force reseed (set via environment variable)
	if os.Getenv("FORCE_RESEED") == "true" {
		log.Println("Force reseed enabled, clearing existing data...")
		// Delete all users and organizations in the correct order to avoid FK constraints
		testDB.Exec("DELETE FROM users WHERE username IN ('owner', 'admin') OR tenant_id = '00000000-0000-0000-0000-000000000001'")
		testDB.Exec("DELETE FROM organizations WHERE code = 'HQ-001' OR tenant_id = '00000000-0000-0000-0000-000000000001'")
		// Delete tenants created by previous tests
		testDB.Exec("DELETE FROM tenants WHERE code = 'tenant_alpha'")
	}

	// Ensure schema is up to date by adding missing columns if needed
	log.Println("Ensuring database schema is up to date...")
	testDB.Exec("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iam_org_id VARCHAR(100)")
	testDB.Exec("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_shadow BOOLEAN DEFAULT false")
	testDB.Exec("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_dispatch_hops INT DEFAULT 3")
	testDB.Exec("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS path VARCHAR(500)")
	testDB.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS iam_sub VARCHAR(100)")
	testDB.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_shadow BOOLEAN DEFAULT false")
	testDB.Exec("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255)")
	testDB.Exec("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_phone VARCHAR(20)")
	testDB.Exec("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_hops INT DEFAULT 3")

	// Run seeder to ensure admin user exists
	seeder := db.NewSeeder(testDB)
	if err := seeder.SeedAll(); err != nil {
		log.Printf("Warning: failed to seed database: %v", err)
		// Don't return false, as this might be a partial failure
	}

	return true
}

// teardownTestDB cleans up database connection
func teardownTestDB() {
	if testDB != nil {
		database.Close()
	}
}

// ExecuteRequest executes an HTTP request against the test router
// Returns the response recorder for assertions
// Note: JSON marshaling errors will cause test failure via t.Fatalf
func ExecuteRequest(t *testing.T, method, url string, body interface{}, headers map[string]string) *httptest.ResponseRecorder {
	if t != nil {
		t.Helper()
	}

	if testRouter == nil {
		return nil
	}

	var reqBody []byte
	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
	}

	req := httptest.NewRequest(method, url, bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	// Add custom headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)

	return w
}

// ExecuteRequestWithAuth executes a request with authorization token
func ExecuteRequestWithAuth(t *testing.T, method, url string, body interface{}, token string) *httptest.ResponseRecorder {
	t.Helper()
	headers := map[string]string{}
	if token != "" {
		headers["Authorization"] = "Bearer " + token
	}
	return ExecuteRequest(t, method, url, body, headers)
}

// ParseResponse parses JSON response into the given interface
func ParseResponse(w *httptest.ResponseRecorder, v interface{}) error {
	return json.Unmarshal(w.Body.Bytes(), v)
}

// getEnv gets environment variable or returns default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// BeginTransaction starts a new database transaction for test isolation
// Usage: defer BeginTransaction()()
// Note: In production, you should use a test database or clean up data manually
// This is a helper for unit tests that need transaction rollback
func BeginTransaction(t *testing.T) func() {
	t.Helper()
	tx := testDB.Begin()
	if tx.Error != nil {
		t.Fatalf("failed to begin transaction: %v", tx.Error)
	}

	// Return cleanup function
	return func() {
		if err := tx.Rollback().Error; err != nil {
			t.Logf("failed to rollback transaction: %v", err)
		}
	}
}
