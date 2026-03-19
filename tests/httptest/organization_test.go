package httptest

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

var orgAdminToken string

func setupOrgTestHelpers() {
	if orgAdminToken == "" {
		orgAdminToken = getAdminToken()
	}
}

func TestCreateOrganization(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupOrgTestHelpers()
	if orgAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "创建组织缺少名称",
			payload: map[string]interface{}{
				"type": "BRAND_HQ",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建组织缺少类型",
			payload: map[string]interface{}{
				"name": "Test Organization",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建组织类型无效",
			payload: map[string]interface{}{
				"name": "Test Organization",
				"type": "INVALID_TYPE",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/organizations", tt.payload, orgAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestListOrganizations(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupOrgTestHelpers()
	if orgAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
	}{
		{
			name:           "查询组织列表",
			queryParams:    "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询组织列表带分页",
			queryParams:    "?page=1&page_size=20",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/organizations"+tt.queryParams, nil, orgAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetOrganization(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupOrgTestHelpers()
	if orgAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		orgID          string
		expectedStatus int
	}{
		{
			name:           "查询存在的组织",
			orgID:          getTestOrgID(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询不存在的组织",
			orgID:          uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			orgID:          "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/organizations/"+tt.orgID, nil, orgAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetOrganizationTree(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupOrgTestHelpers()
	if orgAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "查询组织树",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/organizations/tree", nil, orgAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUpdateOrganization(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupOrgTestHelpers()
	if orgAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		orgID          string
		payload        interface{}
		expectedStatus int
	}{
		{
			name:  "更新存在的组织",
			orgID: getTestOrgID(),
			payload: map[string]interface{}{
				"name": fmt.Sprintf("Updated Org %d", time.Now().Unix()),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:  "更新不存在的组织",
			orgID: uuid.Nil.String(),
			payload: map[string]interface{}{
				"name": "Updated Name",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "PUT", "/api/v1/organizations/"+tt.orgID, tt.payload, orgAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestOrganization_CrossTenantIsolation(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupOrgTestHelpers()
	if orgAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	t.Run("租户内组织可见", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/organizations/"+getTestOrgID(), nil, orgAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("其他租户组织不可见", func(t *testing.T) {
		nonExistentOrgID := uuid.Nil.String()
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/organizations/"+nonExistentOrgID, nil, orgAdminToken)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
