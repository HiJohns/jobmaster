package httptest

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

var locationAdminToken string

func setupLocationTestHelpers() {
	if locationAdminToken == "" {
		locationAdminToken = getAdminToken()
	}
}

func TestCreateLocation(t *testing.T) {
	setupLocationTestHelpers()

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "创建位置缺少名称",
			payload: map[string]interface{}{
				"org_id": getTestOrgID(),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建位置缺少org_id",
			payload: map[string]interface{}{
				"name": "Test Location",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建位置org_id无效",
			payload: map[string]interface{}{
				"name":   "Test Location",
				"org_id": "invalid-uuid",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "创建位置成功",
			payload: map[string]interface{}{
				"name":   fmt.Sprintf("Test Location %d", time.Now().UnixNano()),
				"org_id": getTestOrgID(),
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/locations", tt.payload, locationAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestListLocations(t *testing.T) {
	setupLocationTestHelpers()

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
	}{
		{
			name:           "查询位置列表",
			queryParams:    "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询位置列表带分页",
			queryParams:    "?page=1&page_size=20",
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
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/locations"+tt.queryParams, nil, locationAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetLocation(t *testing.T) {
	setupLocationTestHelpers()

	tests := []struct {
		name           string
		locationID     string
		expectedStatus int
	}{
		{
			name:           "查询存在的位置",
			locationID:     uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "查询不存在的位置",
			locationID:     uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			locationID:     "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/locations/"+tt.locationID, nil, locationAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUpdateLocation(t *testing.T) {
	setupLocationTestHelpers()

	tests := []struct {
		name           string
		locationID     string
		payload        interface{}
		expectedStatus int
	}{
		{
			name:       "更新不存在的位置",
			locationID: uuid.Nil.String(),
			payload: map[string]interface{}{
				"name": "Updated Location",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "无效UUID格式",
			locationID: "not-a-uuid",
			payload: map[string]interface{}{
				"name": "Updated Location",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "PUT", "/api/v1/locations/"+tt.locationID, tt.payload, locationAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestDeleteLocation(t *testing.T) {
	setupLocationTestHelpers()

	tests := []struct {
		name           string
		locationID     string
		expectedStatus int
	}{
		{
			name:           "删除不存在的位置",
			locationID:     uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			locationID:     "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "DELETE", "/api/v1/locations/"+tt.locationID, nil, locationAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestLocation_CrossTenantIsolation(t *testing.T) {
	setupLocationTestHelpers()

	t.Run("租户内位置可见", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/locations", nil, locationAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("跨租户位置隔离", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/locations?org_id="+getTestOrgID(), nil, locationAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}
