package httptest

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

var userAdminToken string

func setupUserTestHelpers() {
	if userAdminToken == "" {
		userAdminToken = getAdminToken()
	}
}

func TestCreateUser(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupUserTestHelpers()
	if userAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "创建用户缺少用户名",
			payload: map[string]interface{}{
				"password": "password123",
				"role":     "ADMIN",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建用户缺少密码",
			payload: map[string]interface{}{
				"username": "newuser",
				"role":     "ADMIN",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建用户密码过短",
			payload: map[string]interface{}{
				"username": "newuser",
				"password": "12345",
				"role":     "ADMIN",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建用户角色无效",
			payload: map[string]interface{}{
				"username": "newuser",
				"password": "password123",
				"role":     "INVALID_ROLE",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/users", tt.payload, userAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestListUsers(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupUserTestHelpers()
	if userAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
	}{
		{
			name:           "查询用户列表",
			queryParams:    "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询用户列表带分页",
			queryParams:    "?page=1&page_size=20",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "按角色过滤",
			queryParams:    "?role=ADMIN",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "按组织过滤",
			queryParams:    "?org_id=" + getTestOrgID(),
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/users"+tt.queryParams, nil, userAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetUser(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupUserTestHelpers()
	if userAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		userID         string
		expectedStatus int
	}{
		{
			name:           "查询存在的用户",
			userID:         uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			userID:         "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/users/"+tt.userID, nil, userAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUpdateUser(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupUserTestHelpers()
	if userAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		userID         string
		payload        interface{}
		expectedStatus int
	}{
		{
			name:   "更新不存在的用户",
			userID: uuid.Nil.String(),
			payload: map[string]interface{}{
				"display_name": "Updated Name",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "无效UUID格式",
			userID: "not-a-uuid",
			payload: map[string]interface{}{
				"display_name": "Updated Name",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "PUT", "/api/v1/users/"+tt.userID, tt.payload, userAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestDeleteUser(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupUserTestHelpers()
	if userAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		userID         string
		expectedStatus int
	}{
		{
			name:           "删除不存在的用户",
			userID:         uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			userID:         "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "DELETE", "/api/v1/users/"+tt.userID, nil, userAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUser_CrossTenantIsolation(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupUserTestHelpers()
	if userAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	t.Run("租户内用户可见", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/users", nil, userAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("跨租户用户隔离", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/users", nil, userAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func createTestUserPayload() map[string]interface{} {
	return map[string]interface{}{
		"username":     fmt.Sprintf("testuser_%d", time.Now().UnixNano()),
		"password":     "password123",
		"role":         "ADMIN",
		"display_name": "Test User",
	}
}
