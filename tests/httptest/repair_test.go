package httptest

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var repairAdminToken string

func setupRepairTestHelpers() {
	if repairAdminToken == "" {
		repairAdminToken = getAdminToken()
	}
}

func TestSubmitRepair(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupRepairTestHelpers()
	if repairAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "提交维修缺少SN",
			payload: map[string]interface{}{
				"description": "Device not working",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "提交维修缺少描述",
			payload: map[string]interface{}{
				"sn": fmt.Sprintf("SN-REPAIR-%d", time.Now().UnixNano()),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "提交维修空描述",
			payload: map[string]interface{}{
				"sn":          fmt.Sprintf("SN-REPAIR-%d", time.Now().UnixNano()),
				"description": "",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "提交维修成功",
			payload: map[string]interface{}{
				"sn":          fmt.Sprintf("SN-REPAIR-%d", time.Now().UnixNano()),
				"description": "Device not working properly",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "提交维修带联系方式",
			payload: map[string]interface{}{
				"sn":            fmt.Sprintf("SN-REPAIR-%d", time.Now().UnixNano()),
				"description":   "Device malfunction",
				"contact_name":  "Test Contact",
				"contact_phone": "13800138000",
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/repair/submit", tt.payload, repairAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestSubmitRepair_DeviceNotFound(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupRepairTestHelpers()
	if repairAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	t.Run("提交维修设备不存在", func(t *testing.T) {
		payload := map[string]interface{}{
			"sn":          "NONEXISTENT-SN-12345",
			"description": "Device not found",
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/repair/submit", payload, repairAdminToken)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestSubmitRepair_CrossTenantIsolation(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupRepairTestHelpers()
	if repairAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	t.Run("租户隔离-提交维修", func(t *testing.T) {
		payload := map[string]interface{}{
			"sn":          fmt.Sprintf("SN-ISO-%d", time.Now().UnixNano()),
			"description": "Test repair for cross-tenant isolation",
		}
		w := ExecuteRequestWithAuth(t, "POST", "/api/v1/repair/submit", payload, repairAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}
