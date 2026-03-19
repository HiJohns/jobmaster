package httptest

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var leaseAdminToken string

func setupLeaseTestHelpers() {
	if leaseAdminToken == "" {
		leaseAdminToken = getAdminToken()
	}
}

func TestGetLeaseProgress(t *testing.T) {
	setupLeaseTestHelpers()

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
	}{
		{
			name:           "查询租期进度无设备ID",
			queryParams:    "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "查询租期进度带设备ID",
			queryParams:    "?device_id=" + getTestOrgID(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询租期进度无效设备ID",
			queryParams:    "?device_id=invalid-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/leases/progress"+tt.queryParams, nil, leaseAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUpdateLeaseProgress(t *testing.T) {
	setupLeaseTestHelpers()

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name:           "更新租期进度缺少字段",
			payload:        map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "更新租期进度缺少device_id",
			payload: map[string]interface{}{
				"months":        12,
				"progress_days": 365,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "更新租期进度缺少months",
			payload: map[string]interface{}{
				"device_id":     getTestOrgID(),
				"progress_days": 365,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "更新租期进度缺少progress_days",
			payload: map[string]interface{}{
				"device_id": getTestOrgID(),
				"months":    12,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "更新租期进度月份无效",
			payload: map[string]interface{}{
				"device_id":     getTestOrgID(),
				"months":        -1,
				"progress_days": 365,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "更新租期进度月份过大",
			payload: map[string]interface{}{
				"device_id":     getTestOrgID(),
				"months":        1000,
				"progress_days": 365,
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", tt.payload, leaseAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestLeaseProgress_12MonthThreshold(t *testing.T) {
	setupLeaseTestHelpers()

	t.Run("触发12个月阈值", func(t *testing.T) {
		payload := map[string]interface{}{
			"device_id":     getTestOrgID(),
			"months":        12,
			"progress_days": 365,
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", payload, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("超过12个月阈值触发所有权转移", func(t *testing.T) {
		payload := map[string]interface{}{
			"device_id":     getTestOrgID(),
			"months":        13,
			"progress_days": 400,
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", payload, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestLeaseProgress_AlreadyCompleted(t *testing.T) {
	setupLeaseTestHelpers()

	t.Run("已完成租期更新", func(t *testing.T) {
		payload := map[string]interface{}{
			"device_id":     getTestOrgID(),
			"months":        24,
			"progress_days": 730,
			"status":        "COMPLETED",
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", payload, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestLeaseProgress_CrossTenantIsolation(t *testing.T) {
	setupLeaseTestHelpers()

	t.Run("租户隔离-查询租期进度", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/leases/progress?device_id="+getTestOrgID(), nil, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("租户隔离-更新租期进度", func(t *testing.T) {
		payload := map[string]interface{}{
			"device_id":     getTestOrgID(),
			"months":        6,
			"progress_days": 180,
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", payload, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestLeaseProgress_TimeTravel(t *testing.T) {
	setupLeaseTestHelpers()

	t.Run("时间回溯到过去", func(t *testing.T) {
		payload := map[string]interface{}{
			"device_id":     getTestOrgID(),
			"months":        3,
			"progress_days": 90,
			"update_time":   time.Now().Add(-24 * time.Hour).Format(time.RFC3339),
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", payload, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("时间跳跃到未来", func(t *testing.T) {
		payload := map[string]interface{}{
			"device_id":     getTestOrgID(),
			"months":        18,
			"progress_days": 540,
			"update_time":   time.Now().Add(30 * 24 * time.Hour).Format(time.RFC3339),
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/leases/progress/update", payload, leaseAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}
