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
	"jobmaster/pkg/database"
)

var (
	testRouter *gin.Engine
	testDB     *gorm.DB
)

// TestMain initializes the test environment
func TestMain(m *testing.M) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Setup database connection for tests
	setupTestDB()

	// Create test router
	testRouter = api.SetupRouter()

	// Run tests
	code := m.Run()

	// Cleanup
	teardownTestDB()

	os.Exit(code)
}

// setupTestDB initializes database connection for testing
func setupTestDB() {
	// Use test database configuration
	config := &database.Config{
		Host:     getEnv("TEST_DB_HOST", "localhost"),
		Port:     getEnv("TEST_DB_PORT", "5432"),
		User:     getEnv("TEST_DB_USER", "jobmaster"),
		Password: getEnv("TEST_DB_PASSWORD", "jobmaster_dev_password"),
		Database: getEnv("TEST_DB_NAME", "jobmaster"),
		SSLMode:  getEnv("TEST_DB_SSLMODE", "disable"),
	}

	db, err := database.InitDB(config)
	if err != nil {
		log.Fatalf("failed to connect to test database: %v", err)
		os.Exit(1)
	}
	testDB = db
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
	t.Helper()
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
