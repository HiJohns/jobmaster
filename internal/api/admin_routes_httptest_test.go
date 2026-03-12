package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"jobmaster/internal/model"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockTenantRepo implements TenantRepository for testing
type mockTenantRepo struct {
	tenants map[string]*model.Tenant
}

func newMockTenantRepo() *mockTenantRepo {
	return &mockTenantRepo{tenants: make(map[string]*model.Tenant)}
}

func (m *mockTenantRepo) Create(tenant *model.Tenant) error {
	tenant.ID = 1
	m.tenants[tenant.Code] = tenant
	return nil
}

func (m *mockTenantRepo) GetByCode(code string) (*model.Tenant, error) {
	if t, ok := m.tenants[code]; ok {
		return t, nil
	}
	return nil, nil
}

func (m *mockTenantRepo) List(offset, limit int) ([]model.Tenant, int64, error) {
	var list []model.Tenant
	for _, t := range m.tenants {
		list = append(list, *t)
	}
	return list, int64(len(list)), nil
}

func (m *mockTenantRepo) AddAuditLog(userID uuid.UUID, userName, action, details string, targetID uint) error {
	return nil
}

// TestAdminTenantRoutes_HTTPTest tests admin tenant routes using httptest
func TestAdminTenantRoutes_HTTPTest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := newMockTenantRepo()
	router := SetupRouter(repo)

	t.Run("POST /api/v1/admin/tenants - Route exists", func(t *testing.T) {
		body := map[string]interface{}{
			"name": "Test Tenant",
			"code": "test-001",
		}
		jsonBody, _ := json.Marshal(body)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// Should NOT be 404 - route should exist
		assert.NotEqual(t, http.StatusNotFound, w.Code,
			"Route should be registered. Got %d: %s", w.Code, w.Body.String())
	})

	t.Run("GET /api/v1/admin/tenants - Route exists", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/admin/tenants", nil)
		router.ServeHTTP(w, req)

		// Should NOT be 404 - route should exist
		assert.NotEqual(t, http.StatusNotFound, w.Code,
			"Route should be registered. Got %d: %s", w.Code, w.Body.String())
	})
}

// TestAdminTenantRoutes_WithMockAuth tests routes with mock authentication
func TestAdminTenantRoutes_WithMockAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := newMockTenantRepo()
	router := SetupRouter(repo)

	t.Run("POST /api/v1/admin/tenants - Without auth returns 401", func(t *testing.T) {
		body := map[string]interface{}{
			"name": "Test Tenant",
			"code": "test-002",
		}
		jsonBody, _ := json.Marshal(body)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// Without auth token, should return 401
		assert.Equal(t, http.StatusUnauthorized, w.Code,
			"Without auth should return 401. Got %d: %s", w.Code, w.Body.String())
	})

	t.Run("GET /api/v1/admin/tenants - Without auth returns 401", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/admin/tenants", nil)
		router.ServeHTTP(w, req)

		// Without auth token, should return 401
		assert.Equal(t, http.StatusUnauthorized, w.Code,
			"Without auth should return 401. Got %d: %s", w.Code, w.Body.String())
	})
}

// TestAdminTenantRoutes_PathDuplication specifically tests for the duplicate path bug
func TestAdminTenantRoutes_PathDuplication(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := newMockTenantRepo()
	router := SetupRouter(repo)

	t.Run("Duplicate path /api/v1/api/v1/admin/tenants should 404", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/api/v1/admin/tenants", nil)
		router.ServeHTTP(w, req)

		// This is the bug path - it should 404
		assert.Equal(t, http.StatusNotFound, w.Code,
			"Duplicate path should correctly return 404")
	})

	t.Run("Correct path /api/v1/admin/tenants should not 404", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/admin/tenants", nil)
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// Correct path should NOT 404 (will 401 without auth)
		assert.NotEqual(t, http.StatusNotFound, w.Code,
			"Correct path should be registered, got %d", w.Code)
	})
}
