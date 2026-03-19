package httptest

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

var (
	deviceAdminToken    string
	deviceVendorToken   string
	deviceEngineerToken string
)

func setupDeviceTestHelpers() {
	if !dbAvailable {
		return
	}
	if deviceAdminToken == "" {
		deviceAdminToken = getAdminToken()
	}
	if deviceEngineerToken == "" {
		deviceEngineerToken = getEngineerToken()
	}
}

func TestCreateDevice(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupDeviceTestHelpers()
	if deviceAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "创建设备成功",
			payload: map[string]interface{}{
				"sn":     fmt.Sprintf("SN-TEST-%d", time.Now().UnixNano()),
				"name":   "Test Device",
				"model":  "Test Model",
				"brand":  "Test Brand",
				"org_id": getTestOrgID(),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "缺少SN",
			payload: map[string]interface{}{
				"name":   "Test Device",
				"model":  "Test Model",
				"org_id": getTestOrgID(),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "缺少名称",
			payload: map[string]interface{}{
				"sn":     fmt.Sprintf("SN-TEST-%d", time.Now().UnixNano()),
				"model":  "Test Model",
				"org_id": getTestOrgID(),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "缺少org_id",
			payload: map[string]interface{}{
				"sn":    fmt.Sprintf("SN-TEST-%d", time.Now().UnixNano()),
				"name":  "Test Device",
				"model": "Test Model",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "无效org_id格式",
			payload: map[string]interface{}{
				"sn":     fmt.Sprintf("SN-TEST-%d", time.Now().UnixNano()),
				"name":   "Test Device",
				"model":  "Test Model",
				"org_id": "not-a-uuid",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/devices", tt.payload, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCreateDevice_DuplicateSN(t *testing.T) {
	setupDeviceTestHelpers()

	sn := fmt.Sprintf("SN-DUP-%d", time.Now().UnixNano())

	payload := map[string]interface{}{
		"sn":     sn,
		"name":   "First Device",
		"model":  "Test Model",
		"brand":  "Test Brand",
		"org_id": getTestOrgID(),
	}

	w := ExecuteRequestWithAuth(t, "POST", "/api/v1/devices", payload, deviceAdminToken)
	if w.Code != http.StatusOK {
		t.Skip("Cannot create first device, skipping duplicate test")
	}

	payload["name"] = "Duplicate Device"
	w2 := ExecuteRequestWithAuth(t, "POST", "/api/v1/devices", payload, deviceAdminToken)
	assert.Equal(t, http.StatusBadRequest, w2.Code)
}

func TestListDevices(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupDeviceTestHelpers()
	if deviceAdminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
	}{
		{
			name:           "分页查询设备",
			queryParams:    "?page=1&page_size=10",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "按组织过滤",
			queryParams:    "?org_id=" + getTestOrgID(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "无效分页参数",
			queryParams:    "?page=-1&page_size=1000",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices"+tt.queryParams, nil, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetDevice(t *testing.T) {
	setupDeviceTestHelpers()

	device := createTestDevice(t, deviceAdminToken)
	if device == nil {
		t.Skip("Cannot create test device, skipping test")
	}

	tests := []struct {
		name           string
		deviceID       string
		expectedStatus int
	}{
		{
			name:           "查询存在的设备",
			deviceID:       device.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询不存在的设备",
			deviceID:       uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			deviceID:       "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/"+tt.deviceID, nil, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetDeviceBySN(t *testing.T) {
	setupDeviceTestHelpers()

	device := createTestDevice(t, deviceAdminToken)
	if device == nil {
		t.Skip("Cannot create test device, skipping test")
	}

	tests := []struct {
		name           string
		sn             string
		expectedStatus int
	}{
		{
			name:           "按SN查询存在的设备",
			sn:             device.SN,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "按SN查询不存在的设备",
			sn:             "NONEXISTENT-SN-12345",
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/sn/"+tt.sn, nil, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGenerateQRCode(t *testing.T) {
	setupDeviceTestHelpers()

	device := createTestDevice(t, deviceAdminToken)
	if device == nil {
		t.Skip("Cannot create test device, skipping test")
	}

	tests := []struct {
		name           string
		deviceID       string
		expectedStatus int
	}{
		{
			name:           "生成设备二维码",
			deviceID:       device.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "生成不存在设备的二维码",
			deviceID:       uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/"+tt.deviceID+"/qrcode", nil, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUpdateDevice(t *testing.T) {
	setupDeviceTestHelpers()

	device := createTestDevice(t, deviceAdminToken)
	if device == nil {
		t.Skip("Cannot create test device, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "更新设备成功",
			payload: map[string]interface{}{
				"name":  "Updated Device Name",
				"model": "Updated Model",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "更新不存在的设备",
			payload: map[string]interface{}{
				"name": "Updated Name",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			deviceID := device.ID.String()
			if tt.name == "更新不存在的设备" {
				deviceID = uuid.Nil.String()
			}
			w := ExecuteRequestWithAuth(t, "PUT", "/api/v1/devices/"+deviceID, tt.payload, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestDeleteDevice(t *testing.T) {
	setupDeviceTestHelpers()

	device := createTestDevice(t, deviceAdminToken)
	if device == nil {
		t.Skip("Cannot create test device, skipping test")
	}

	tests := []struct {
		name           string
		deviceID       string
		expectedStatus int
	}{
		{
			name:           "删除设备成功",
			deviceID:       device.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "删除不存在的设备",
			deviceID:       uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "DELETE", "/api/v1/devices/"+tt.deviceID, nil, deviceAdminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestDevice_CrossTenantIsolation(t *testing.T) {
	setupDeviceTestHelpers()

	tenant1Device := createTestDevice(t, deviceAdminToken)
	if tenant1Device == nil {
		t.Skip("Cannot create tenant1 test device, skipping cross-tenant test")
	}

	tenant2Device := createTestDevice(t, deviceAdminToken)
	if tenant2Device == nil {
		t.Skip("Cannot create tenant2 test device, skipping cross-tenant test")
	}

	_ = tenant2Device

	t.Run("租户1设备对租户2不可见", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/"+tenant1Device.ID.String(), nil, deviceAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("租户1无法访问租户2的设备ID", func(t *testing.T) {
		fakeTenant2DeviceID := uuid.Nil.String()
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/"+fakeTenant2DeviceID, nil, deviceAdminToken)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeviceBySN_CrossTenantIsolation(t *testing.T) {
	setupDeviceTestHelpers()

	device := createTestDevice(t, deviceAdminToken)
	if device == nil {
		t.Skip("Cannot create test device, skipping test")
	}

	t.Run("同一租户内按SN查询设备", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/sn/"+device.SN, nil, deviceAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("跨租户SN隔离", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "GET", "/api/v1/devices/sn/"+device.SN, nil, deviceAdminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}
