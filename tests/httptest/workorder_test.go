package httptest

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"jobmaster/internal/model"
)

var (
	adminToken    string
	engineerToken string
	vendorToken   string
)

func setupTestHelpers() {
	if !dbAvailable {
		return
	}
	if adminToken == "" {
		adminToken = getAdminToken()
	}
	if engineerToken == "" {
		engineerToken = getEngineerToken()
	}
	if vendorToken == "" {
		vendorToken = getVendorToken()
	}
}

func getAdminToken() string {
	return getAdminTokenWithT(nil)
}

func getAdminTokenWithT(t *testing.T) string {
	payload := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	if w == nil || w.Code != http.StatusOK {
		return ""
	}
	var resp map[string]interface{}
	ParseResponse(w, &resp)
	if data, ok := resp["data"].(map[string]interface{}); ok {
		if token, ok := data["token"].(string); ok {
			return token
		}
	}
	return ""
}

func getEngineerToken() string {
	return getEngineerTokenWithT(nil)
}

func getEngineerTokenWithT(t *testing.T) string {
	payload := map[string]string{
		"username": "engineer",
		"password": "engineer123",
	}
	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	if w == nil || w.Code != http.StatusOK {
		return ""
	}
	var resp map[string]interface{}
	ParseResponse(w, &resp)
	if data, ok := resp["data"].(map[string]interface{}); ok {
		if token, ok := data["token"].(string); ok {
			return token
		}
	}
	return ""
}

func getVendorToken() string {
	return getVendorTokenWithT(nil)
}

func getVendorTokenWithT(t *testing.T) string {
	payload := map[string]string{
		"username": "vendor",
		"password": "vendor123",
	}
	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	if w == nil || w.Code != http.StatusOK {
		return ""
	}
	var resp map[string]interface{}
	ParseResponse(w, &resp)
	if data, ok := resp["data"].(map[string]interface{}); ok {
		if token, ok := data["token"].(string); ok {
			return token
		}
	}
	return ""
}

func createTestWorkOrder(t *testing.T, token string, status model.WorkOrderStatus) *model.WorkOrder {
	setupTestHelpers()

	payload := map[string]interface{}{
		"description":    fmt.Sprintf("Test order %d", time.Now().UnixNano()),
		"equipment_info": "Test Equipment",
		"contact_name":   "Test Contact",
		"contact_phone":  "13800138000",
	}

	w := ExecuteRequestWithAuth(t, "POST", "/api/v1/workorders", payload, token)
	if w.Code != http.StatusOK {
		return nil
	}

	var resp map[string]interface{}
	ParseResponse(w, &resp)
	if data, ok := resp["data"].(map[string]interface{}); ok {
		return &model.WorkOrder{
			ID:      parseUUID(data["id"]),
			OrderNo: data["order_no"].(string),
			Status:  parseWorkOrderStatus(data["status"].(string)),
		}
	}
	return nil
}

func parseWorkOrderStatus(s string) model.WorkOrderStatus {
	switch s {
	case "PENDING":
		return model.WorkOrderStatusPending
	case "DISPATCHED":
		return model.WorkOrderStatusDispatched
	case "RESERVED":
		return model.WorkOrderStatusReserved
	case "ARRIVED":
		return model.WorkOrderStatusArrived
	case "WORKING":
		return model.WorkOrderStatusWorking
	case "FINISHED":
		return model.WorkOrderStatusFinished
	case "OBSERVING":
		return model.WorkOrderStatusObserving
	case "CLOSED":
		return model.WorkOrderStatusClosed
	default:
		return model.WorkOrderStatusPending
	}
}

func createTestDevice(t *testing.T, token string) *model.Device {
	setupTestHelpers()

	orgID := getTestOrgID()
	payload := map[string]interface{}{
		"sn":     fmt.Sprintf("SN-%d", time.Now().UnixNano()),
		"name":   "Test Device",
		"model":  "Test Model",
		"brand":  "Test Brand",
		"org_id": orgID,
	}

	w := ExecuteRequestWithAuth(t, "POST", "/api/v1/devices", payload, token)
	if w.Code != http.StatusOK {
		return nil
	}

	var resp map[string]interface{}
	ParseResponse(w, &resp)
	if data, ok := resp["data"].(map[string]interface{}); ok {
		return &model.Device{
			ID:   parseUUID(data["id"]),
			SN:   data["sn"].(string),
			Name: data["name"].(string),
		}
	}
	return nil
}

func getTestOrgID() string {
	return "00000000-0000-0000-0000-000000000001"
}

func parseUUID(v interface{}) uuid.UUID {
	switch val := v.(type) {
	case string:
		id, _ := uuid.Parse(val)
		return id
	case float64:
		return uuid.Nil
	default:
		return uuid.Nil
	}
}

func TestCreateWorkOrder(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "成功创建",
			payload: map[string]interface{}{
				"description":    "Test order",
				"equipment_info": "Test Equipment",
				"contact_name":   "Test Contact",
				"contact_phone":  "13800138000",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "缺少描述",
			payload: map[string]interface{}{
				"equipment_info": "Test Equipment",
				"contact_name":   "Test Contact",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "空描述",
			payload: map[string]interface{}{
				"description":  "",
				"contact_name": "Test Contact",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", "/api/v1/workorders", tt.payload, adminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestListWorkOrders(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
	}{
		{
			name:           "分页查询",
			queryParams:    "?page=1&page_size=10",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "状态过滤",
			queryParams:    "?status=PENDING",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "日期范围",
			queryParams:    "?start_date=2024-01-01&end_date=2024-12-31",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/workorders"+tt.queryParams, nil, adminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetWorkOrder(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		orderID        string
		expectedStatus int
	}{
		{
			name:           "查询存在的工单",
			orderID:        order.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询不存在的工单",
			orderID:        uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			orderID:        "invalid-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/workorders/"+tt.orderID, nil, adminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWorkOrderStateMachine_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		endpoint       string
		method         string
		payload        interface{}
		expectedStatus int
		description    string
	}{
		{
			name:     "PENDING直接Finish",
			endpoint: fmt.Sprintf("/api/v1/workorders/%s/finish", order.ID),
			method:   "POST",
			payload: map[string]interface{}{
				"description": "尝试非法流转",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Cannot finish pending order directly",
		},
		{
			name:     "PENDING直接Arrive",
			endpoint: fmt.Sprintf("/api/v1/workorders/%s/arrive", order.ID),
			method:   "POST",
			payload: map[string]interface{}{
				"latitude":  39.9042,
				"longitude": 116.4074,
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Cannot arrive before accepting",
		},
		{
			name:     "PENDING直接Reject",
			endpoint: fmt.Sprintf("/api/v1/workorders/%s/reject", order.ID),
			method:   "POST",
			payload: map[string]interface{}{
				"reason": "test rejection",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Cannot reject pending order",
		},
		{
			name:     "PENDING直接Reserve",
			endpoint: fmt.Sprintf("/api/v1/workorders/%s/reserve", order.ID),
			method:   "POST",
			payload: map[string]interface{}{
				"appointed_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Cannot reserve pending order",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, tt.method, tt.endpoint, tt.payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestDispatchWorkOrder_Success(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	t.Run("派单成功", func(t *testing.T) {
		payload := map[string]interface{}{
			"vendor_id": getTestOrgID(),
		}
		w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/dispatch", order.ID), payload, adminToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestAcceptWorkOrder(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	t.Run("接单成功", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/accept", order.ID), map[string]interface{}{
			"scheduled_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		}, engineerToken)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("接单无效时间", func(t *testing.T) {
		w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/accept", order.ID), map[string]interface{}{
			"scheduled_at": "invalid-date",
		}, engineerToken)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestRejectWorkOrder(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		reason         interface{}
		expectedStatus int
	}{
		{
			name:           "拒单成功",
			reason:         "无法处理",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "缺少原因",
			reason:         nil,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{}
			if tt.reason != nil {
				payload["reason"] = tt.reason
			}
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/reject", order.ID), payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestArriveWorkOrder_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		latitude       float64
		longitude      float64
		expectedStatus int
	}{
		{
			name:           "PENDING状态不能到达",
			latitude:       39.9042,
			longitude:      116.4074,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效坐标也是BadRequest(因为状态不对)",
			latitude:       -1000,
			longitude:      -2000,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"latitude":  tt.latitude,
				"longitude": tt.longitude,
			}
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/arrive", order.ID), payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestFinishWorkOrder_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "PENDING状态不能完工",
			payload: map[string]interface{}{
				"description": "Test completion",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "PENDING状态完工缺少描述也是BadRequest",
			payload: map[string]interface{}{
				"description": "",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/finish", order.ID), tt.payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestRejectWorkOrder_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "PENDING状态不能拒单",
			payload: map[string]interface{}{
				"reason": "test rejection",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "拒单缺少原因",
			payload:        map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/reject", order.ID), tt.payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestDispatchWorkOrder_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name:           "缺少vendor_id和engineer_id",
			payload:        map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "无效vendor_id格式",
			payload: map[string]interface{}{
				"vendor_id": "invalid-uuid",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/dispatch", order.ID), tt.payload, adminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestAcceptWorkOrder_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "PENDING状态不能接单",
			payload: map[string]interface{}{
				"scheduled_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "接单缺少scheduled_at",
			payload:        map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "接单时间格式无效",
			payload: map[string]interface{}{
				"scheduled_at": "invalid-date",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/accept", order.ID), tt.payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestReserveWorkOrder_InvalidTransition(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		payload        interface{}
		expectedStatus int
	}{
		{
			name: "PENDING状态不能预约",
			payload: map[string]interface{}{
				"appointed_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "预约缺少appointed_at",
			payload:        map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/reserve", order.ID), tt.payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetWorkOrderDetail(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		orderID        string
		expectedStatus int
	}{
		{
			name:           "查询工单详情成功",
			orderID:        order.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "查询不存在的工单详情",
			orderID:        uuid.Nil.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "无效UUID格式",
			orderID:        "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s/detail", tt.orderID), nil, adminToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestValidateWorkOrderLocation(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	setupTestHelpers()
	if adminToken == "" {
		t.Skip("Admin token not available, skipping test")
	}

	order := createTestWorkOrder(t, adminToken, model.WorkOrderStatusPending)
	if order == nil {
		t.Skip("Cannot create test work order, skipping test")
	}

	tests := []struct {
		name           string
		latitude       float64
		longitude      float64
		expectedStatus int
	}{
		{
			name:           "GPS校验有效坐标",
			latitude:       39.9042,
			longitude:      116.4074,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "GPS校验无效坐标格式",
			latitude:       -1000,
			longitude:      -2000,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "GPS校验缺少坐标",
			latitude:       0,
			longitude:      0,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"latitude":  tt.latitude,
				"longitude": tt.longitude,
			}
			w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/validate-location", order.ID), payload, engineerToken)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
