package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"jobmaster/internal/api/admin"
	"jobmaster/internal/model"
	"jobmaster/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockTenantRepository is a mock implementation for testing
type mockTenantRepository struct{}

func (m *mockTenantRepository) Create(tenant *model.Tenant) error {
	return nil
}

func (m *mockTenantRepository) GetByCode(code string) (*model.Tenant, error) {
	return nil, nil
}

func (m *mockTenantRepository) List(offset, limit int) ([]model.Tenant, int64, error) {
	return []model.Tenant{}, 0, nil
}

func (m *mockTenantRepository) AddAuditLog(userID uuid.UUID, userName, action, details string, targetID uint) error {
	return nil
}

// TestAdminTenantRoutes_Registered tests that admin tenant routes are properly registered
func TestAdminTenantRoutes_Registered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	v1 := r.Group("/api/v1")

	// Create mock repository
	var mockRepo repository.TenantRepository = &mockTenantRepository{}

	// This should register the routes
	admin.RegisterRoutes(v1, mockRepo)

	// Test POST /api/v1/admin/tenants
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", nil)
	r.ServeHTTP(w, req)

	// Should not return 404 (it may return 401/403 due to missing auth, but not 404)
	assert.NotEqual(t, http.StatusNotFound, w.Code, "POST /api/v1/admin/tenants should be registered but got 404")

	// Test GET /api/v1/admin/tenants
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/admin/tenants", nil)
	r.ServeHTTP(w, req)

	// Should not return 404
	assert.NotEqual(t, http.StatusNotFound, w.Code, "GET /api/v1/admin/tenants should be registered but got 404")
}

// TestAdminTenantRoutes_NotRegistered_BeforeFix tests the bug condition
// This test demonstrates the bug - routes are not registered
func TestAdminTenantRoutes_NotRegistered_BeforeFix(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Simulate the old SetupRouter without RegisterAdminRoutes
	r := gin.New()
	v1 := r.Group("/api/v1")

	// Only register protected routes without admin routes (simulating the bug)
	_ = v1.Group("/auth")

	// Test POST /api/v1/admin/tenants - should be 404 without the fix
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", nil)
	r.ServeHTTP(w, req)

	// This demonstrates the bug - returns 404
	assert.Equal(t, http.StatusNotFound, w.Code, "Without fix, route should return 404")
}
