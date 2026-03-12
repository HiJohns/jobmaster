package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"jobmaster/internal/model"
	"jobmaster/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockTenantRepo for testing
type mockTenantRepo struct{}

func (m *mockTenantRepo) Create(tenant *model.Tenant) error            { return nil }
func (m *mockTenantRepo) GetByCode(code string) (*model.Tenant, error) { return nil, nil }
func (m *mockTenantRepo) List(offset, limit int) ([]model.Tenant, int64, error) {
	return []model.Tenant{}, 0, nil
}
func (m *mockTenantRepo) AddAuditLog(userID uuid.UUID, userName, action, details string, targetID uint) error {
	return nil
}

// TestSetupRouter_AdminRoutes_Exist tests that SetupRouter properly registers admin routes
func TestSetupRouter_AdminRoutes_Exist(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Use the actual SetupRouter function with mock repo
	var repo repository.TenantRepository = &mockTenantRepo{}
	router := SetupRouter(repo)

	// Test POST /api/v1/admin/tenants - should NOT return 404
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", nil)
	router.ServeHTTP(w, req)

	// Expected: Not 404 (will be 401 or 500 due to auth, but not 404)
	assert.NotEqual(t, http.StatusNotFound, w.Code,
		"POST /api/v1/admin/tenants should be registered, got %d: %s", w.Code, w.Body.String())

	// Test GET /api/v1/admin/tenants - should NOT return 404
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/admin/tenants", nil)
	router.ServeHTTP(w, req)

	assert.NotEqual(t, http.StatusNotFound, w.Code,
		"GET /api/v1/admin/tenants should be registered, got %d: %s", w.Code, w.Body.String())
}

// TestAdminRoutes_WithNilRepo tests that SetupRouter handles nil repo gracefully
func TestAdminRoutes_WithNilRepo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Use SetupRouter with nil repo (admin routes should not be registered)
	router := SetupRouter(nil)

	// Test POST /api/v1/admin/tenants - should return 404 when repo is nil
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", nil)
	router.ServeHTTP(w, req)

	// Expected: 404 when repo is nil
	assert.Equal(t, http.StatusNotFound, w.Code,
		"POST /api/v1/admin/tenants should return 404 when repo is nil")
}
