package httptest

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"jobmaster/internal/api"
	"jobmaster/internal/db"
)

var (
	demoTenantUUID  = uuid.MustParse("d0000000-0000-0000-0000-000000000001")
	demoContractor1 = uuid.MustParse("d0000000-0000-0000-0000-000000000020")
	demoContractor2 = uuid.MustParse("d0000000-0000-0000-0000-000000000021")
	demoVendor1     = uuid.MustParse("d0000000-0000-0000-0000-000000000030")

	demoEngCon2  = uuid.MustParse("d0000000-0000-0000-0000-000000000204")
	demoEngCon2Usr = uuid.MustParse("d0000000-0000-0000-0000-000000000207")

	seedWOIDs = []uuid.UUID{
		uuid.MustParse("d0000000-0000-0000-0000-000000000001"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000002"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000003"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000004"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000005"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000006"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000007"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000008"),
	}
)

func loginAsDemoUser(t *testing.T, username, password string) string {
	t.Helper()
	payload := map[string]string{
		"username": username,
		"password": password,
	}
	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	if w == nil {
		return ""
	}
	if w.Code != http.StatusOK {
		return ""
	}
	var resp map[string]interface{}
	if err := ParseResponse(w, &resp); err != nil {
		return ""
	}
	if data, ok := resp["data"].(map[string]interface{}); ok {
		if token, ok := data["token"].(string); ok {
			return token
		}
	}
	return ""
}

func extractDataField(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()
	var resp map[string]interface{}
	if err := ParseResponse(w, &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	data, _ := resp["data"].(map[string]interface{})
	return data
}

func extractList(t *testing.T, w *httptest.ResponseRecorder) []interface{} {
	t.Helper()
	data := extractDataField(t, w)
	if data == nil {
		return nil
	}
	if list, ok := data["data"].([]interface{}); ok {
		return list
	}
	list, _ := data["list"].([]interface{})
	return list
}

func ensureDemoSeeded() {
	if testDB == nil {
		return
	}
	seeder := db.NewSeeder(testDB)
	_ = seeder.SeedDemoData()
}

// TestStoryA_FullLifecycle follows cases.md 用例05-10:
// Branch create → admin@contractor1 forward to contractor2 → admin@contractor2 dispatch engineer → engineer work → branch verify → close
func TestStoryA_FullLifecycle(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	// Step 1: employee1@branch1 creates work order (用例05)
	empToken := loginAsDemoUser(t, "employee1@branch1", "demo123")
	if empToken == "" {
		t.Fatal("failed to login as employee1@branch1")
	}
	createPayload := map[string]interface{}{
		"description":   "集成测试-多跳完整链路",
		"contact_name":  "测试联系人",
		"contact_phone": "13800138000",
	}
	w := ExecuteRequestWithAuth(t, "POST", "/api/v1/workorders", createPayload, empToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "create") {
		t.Fatal("create failed")
	}
	createData := extractDataField(t, w)
	orderID := createData["id"].(string)
	assert.Equal(t, "PENDING", createData["status"])

	// Step 2: Verify visible
	w = ExecuteRequestWithAuth(t, "GET", "/api/v1/workorders", nil, empToken)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotEmpty(t, extractList(t, w))

	// Step 3: admin@contractor1 forwards to contractor2 (用例06: FORWARDED)
	con1Token := loginAsDemoUser(t, "admin@contractor1", "demo123")
	if con1Token == "" {
		t.Fatal("failed to login as admin@contractor1")
	}
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/dispatch", orderID),
		map[string]interface{}{"target_org_id": demoContractor2.String()}, con1Token)
	if !assert.Equal(t, http.StatusOK, w.Code, "forward to contractor2") {
		t.Logf("forward response: %s", w.Body.String())
		t.Fatal("forward failed")
	}
	assert.Equal(t, "DISPATCHED", extractDataField(t, w)["status"])

	// Step 4: admin@contractor2 dispatches to engineer (用例08: FORWARDED→DISPATCHED)
	con2Token := loginAsDemoUser(t, "admin@contractor2", "demo123")
	if con2Token == "" {
		t.Fatal("failed to login as admin@contractor2")
	}
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/dispatch", orderID),
		map[string]interface{}{"engineer_id": demoEngCon2Usr.String()}, con2Token)
	if !assert.Equal(t, http.StatusOK, w.Code, "dispatch to engineer") {
		t.Logf("dispatch response: %s", w.Body.String())
		t.Fatal("dispatch failed")
	}
	assert.Equal(t, "DISPATCHED", extractDataField(t, w)["status"])

	// Step 5: engineer1@contractor2 accepts (用例10.1)
	engToken := loginAsDemoUser(t, "engineer1@contractor2", "demo123")
	if engToken == "" {
		t.Fatal("failed to login as engineer1@contractor2")
	}
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/accept", orderID),
		map[string]interface{}{"scheduled_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339)}, engToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "accept") {
		t.Logf("accept response: %s", w.Body.String())
	}
	assert.Equal(t, "ACCEPTED", extractDataField(t, w)["status"])

	// Step 6: Verify my-tasks
	w = ExecuteRequestWithAuth(t, "GET", "/api/v1/my-tasks", nil, engToken)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotEmpty(t, extractList(t, w), "engineer tasks")

	// Step 7: Arrive (用例10.3)
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/arrive", orderID),
		map[string]interface{}{"photo_urls": []string{}, "comment": "到场"}, engToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "arrive") {
		t.Logf("arrive: %s", w.Body.String())
	}
	assert.Equal(t, "WORKING", extractDataField(t, w)["status"])

	// Step 8: Finish (用例10.3)
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/finish", orderID),
		map[string]interface{}{"description": "维修完成", "labor_fee": 100.0}, engToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "finish") {
		t.Logf("finish: %s", w.Body.String())
	}
	assert.Equal(t, "FINISHED", extractDataField(t, w)["status"])

	// Step 9: Verify approve (用例05: 验收通过→PENDING_EVALUATION)
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/verify", orderID),
		map[string]interface{}{"action": "approve", "comment": "验收通过"}, empToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "verify approve") {
		t.Logf("verify: %s", w.Body.String())
		return
	}
	assert.Equal(t, "PENDING_EVALUATION", extractDataField(t, w)["status"])

	// Step 10: Evaluate → CLOSED
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/evaluate", orderID),
		map[string]interface{}{"evaluation_score": 5, "evaluation_notes": "质量好", "estimated_cost": 100.0}, empToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "evaluate") {
		t.Logf("evaluate: %s", w.Body.String())
	} else {
		assert.Equal(t, "CLOSED", extractDataField(t, w)["status"])
	}

	// Step 11: Both branch and contractor1 can still see CLOSED
	w = ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s", orderID), nil, empToken)
	assert.Equal(t, http.StatusOK, w.Code, "branch sees closed")
	w = ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s", orderID), nil, con1Token)
	assert.Equal(t, http.StatusOK, w.Code, "contractor1 sees closed")
}

// TestStoryB_SkipVendor follows cases.md:
// admin@contractor1 dispatches seed-06 directly to own engineer (no forwarding)
// vendor (contractor2) should NOT see it
func TestStoryB_SkipVendor(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	conToken := loginAsDemoUser(t, "admin@contractor1", "demo123")
	if conToken == "" {
		t.Fatal("failed to login as admin@contractor1")
	}

	seed06ID := seedWOIDs[5].String()

	// engineer1@contractor1 (engCon1) can see seed-06 (already DISPATCHED to engCon2)
	engToken := loginAsDemoUser(t, "engineer2@contractor1", "demo123")
	if engToken == "" {
		t.Fatal("failed to login as engineer2@contractor1")
	}
	w := ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s", seed06ID), nil, engToken)
	assert.Equal(t, http.StatusOK, w.Code, "engineer2 should see seed-06")

	// contractor2 (vendor) should NOT see it via detail endpoint
	vendorToken := loginAsDemoUser(t, "employee1@相川", "demo123")
	if vendorToken != "" {
		w = ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s/detail", seed06ID), nil, vendorToken)
		assert.Equal(t, http.StatusNotFound, w.Code, "vendor should NOT see seed-06 detail")
	}
	_ = conToken
}

// TestStoryC_RejectVerify follows cases.md:
// employee1@branch1 rejects verification → FINISHED → DISPATCHED
func TestStoryC_RejectVerify(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	empToken := loginAsDemoUser(t, "employee1@branch1", "demo123")
	if empToken == "" {
		t.Fatal("failed to login as employee1@branch1")
	}

	seed07ID := seedWOIDs[6].String()
	w := ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s/detail", seed07ID), nil, empToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "fetch seed-07") {
		t.Skip("seed-07 not found")
	}

	// Reject
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/verify", seed07ID),
		map[string]interface{}{"action": "reject", "comment": "验收不通过"}, empToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "verify reject") {
		t.Logf("reject: %s", w.Body.String())
		return
	}
	assert.Equal(t, "DISPATCHED", extractDataField(t, w)["status"])

	// contractor1 can still see it
	conToken := loginAsDemoUser(t, "admin@contractor1", "demo123")
	if conToken != "" {
		w = ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s", seed07ID), nil, conToken)
		assert.Equal(t, http.StatusOK, w.Code, "contractor1 still sees after reject")
	}
}

// TestStoryD_RejectOrder follows cases.md:
// admin@contractor1 dispatches seed-08 → FORWARDED, then rejects → PENDING (cleared)
func TestStoryD_RejectOrder(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	conToken := loginAsDemoUser(t, "admin@contractor1", "demo123")
	if conToken == "" {
		t.Fatal("failed to login as admin@contractor1")
	}

	seed08ID := seedWOIDs[7].String()

	// Dispatch seed-08 to contractor1 → FORWARDED
	w := ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/dispatch", seed08ID),
		map[string]interface{}{"target_org_id": demoContractor1.String()}, conToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "forward seed-08") {
		t.Logf("forward: %s", w.Body.String())
		t.Skip("forward failed")
	}

	// Reject: DISPATCHED → PENDING (use vendor who has ActionOrderExecute)
	vendorToken := loginAsDemoUser(t, "employee1@相川", "demo123")
	if vendorToken == "" {
		t.Fatal("failed to login as employee1@相川")
	}
	w = ExecuteRequestWithAuth(t, "POST", fmt.Sprintf("/api/v1/workorders/%s/reject", seed08ID),
		map[string]interface{}{"reason": "无法处理"}, vendorToken)
	if !assert.Equal(t, http.StatusOK, w.Code, "reject") {
		t.Logf("reject: %s", w.Body.String())
		return
	}
	assert.Equal(t, "PENDING", extractDataField(t, w)["status"])

	// branch still sees it
	empToken := loginAsDemoUser(t, "employee1@branch1", "demo123")
	if empToken != "" {
		w = ExecuteRequestWithAuth(t, "GET", fmt.Sprintf("/api/v1/workorders/%s", seed08ID), nil, empToken)
		assert.Equal(t, http.StatusOK, w.Code, "branch sees rejected order")
	}
}

// loginDemoSession logs in via demo API and returns session ID.
// Creates a dedicated demo-enabled router for this purpose.
var (
	demoTestRouter *gin.Engine
	demoTestOnce   sync.Once
)

func getDemoTestRouter() *gin.Engine {
	demoTestOnce.Do(func() {
		os.Setenv("DEMO_MODE", "true")
		demoTestRouter = api.SetupRouter()
		os.Setenv("DEMO_MODE", "false")
	})
	return demoTestRouter
}

func loginDemoSession(t *testing.T, username, password string) string {
	t.Helper()
	payload := map[string]string{
		"username": username,
		"password": password,
	}
	w := executeRequestOn(t, getDemoTestRouter(), "POST", "/api/demo/auth/login", payload, nil)
	if w == nil {
		return ""
	}
	if w.Code != http.StatusOK {
		return ""
	}
	var resp map[string]interface{}
	if err := ParseResponse(w, &resp); err != nil {
		return ""
	}
	session, _ := resp["session"].(string)
	return session
}

// TestDispatchableTargets_Branch verifies branch sees MAIN_CONTRACTOR orgs, no engineers
func TestDispatchableTargets_Branch(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	sid := loginDemoSession(t, "employee1@branch1", "demo123")
	if sid == "" {
		t.Fatal("failed to login via demo API")
	}

	demoRouter := getDemoTestRouter()

	w := executeRequestOn(t, demoRouter, "GET", "/api/demo/dispatchable-targets", nil, map[string]string{"X-Session-Id": sid})
	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	ParseResponse(w, &resp)
	orgs, _ := resp["organizations"].([]interface{})
	engs, _ := resp["engineers"].([]interface{})

	assert.Greater(t, len(orgs), 0, "branch should see at least one contractor")
	assert.Empty(t, engs, "branch should see no engineers")

	for _, org := range orgs {
		o := org.(map[string]interface{})
		assert.Equal(t, "MAIN_CONTRACTOR", o["type"], "branch should only see MAIN_CONTRACTOR type")
	}
}

// TestDispatchableTargets_Contractor verifies contractor sees VENDOR orgs + own engineers
func TestDispatchableTargets_Contractor(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	sid := loginDemoSession(t, "employee1@contractor1", "demo123")
	if sid == "" {
		t.Fatal("failed to login via demo API")
	}

	demoRouter := getDemoTestRouter()

	w := executeRequestOn(t, demoRouter, "GET", "/api/demo/dispatchable-targets", nil, map[string]string{"X-Session-Id": sid})
	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	ParseResponse(w, &resp)
	orgs, _ := resp["organizations"].([]interface{})
	engs, _ := resp["engineers"].([]interface{})

	assert.Greater(t, len(orgs), 0, "contractor should see VENDOR orgs")
	assert.Greater(t, len(engs), 0, "contractor should see own engineers")

	for _, org := range orgs {
		o := org.(map[string]interface{})
		assert.Equal(t, "VENDOR", o["type"], "contractor should only see VENDOR type")
	}
	for _, eng := range engs {
		e := eng.(map[string]interface{})
		assert.Equal(t, "ENGINEER", e["role"], "contractor should only see ENGINEER role")
	}
}

// TestDispatchableTargets_Vendor verifies vendor sees own engineers, no orgs
func TestDispatchableTargets_Vendor(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}
	ensureDemoSeeded()

	sid := loginDemoSession(t, "employee1@vendor1", "demo123")
	if sid == "" {
		t.Fatal("failed to login via demo API")
	}

	demoRouter := getDemoTestRouter()

	w := executeRequestOn(t, demoRouter, "GET", "/api/demo/dispatchable-targets", nil, map[string]string{"X-Session-Id": sid})
	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	ParseResponse(w, &resp)
	orgs, _ := resp["organizations"].([]interface{})
	engs, _ := resp["engineers"].([]interface{})

	assert.Empty(t, orgs, "vendor should see no orgs")
	assert.Greater(t, len(engs), 0, "vendor should see own engineers")

	for _, eng := range engs {
		e := eng.(map[string]interface{})
		assert.Equal(t, "ENGINEER", e["role"], "vendor should only see ENGINEER role")
	}
}

// executeRequestOn executes a request against a specific router (not the global testRouter)
func executeRequestOn(t *testing.T, router *gin.Engine, method, url string, body interface{}, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	if router == nil {
		return nil
	}
	var reqBody []byte
	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
	}
	req := httptest.NewRequest(method, url, bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}
