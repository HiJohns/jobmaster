package httptest

import (
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// TestAccount represents a created test account
type TestAccount struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
	OrgType  string `json:"org_type"`
	Token    string `json:"-"`
	UserID   string `json:"user_id"`
	OrgID    string `json:"org_id"`
	TenantID string `json:"tenant_id"`
	Email    string `json:"email"`
}

// IntegrationFlowData holds all created entities during the test
type IntegrationFlowData struct {
	SysAdminToken string        `json:"-"`
	TenantID      string        `json:"tenant_id"`
	TenantCode    string        `json:"tenant_code"`
	BrandHQToken  string        `json:"-"`
	Store001ID    string        `json:"store_001_id"`
	StoreMGToken  string        `json:"-"`
	EngOrgID      string        `json:"eng_org_id"`
	EngMGToken    string        `json:"-"`
	SuppAID       string        `json:"supp_a_id"`
	SuppBID       string        `json:"supp_b_id"`
	SuppAMGToken  string        `json:"-"`
	SuppBMGToken  string        `json:"-"`
	WorkerAID     string        `json:"worker_a_id"`
	WorkerBID     string        `json:"worker_b_id"`
	Accounts      []TestAccount `json:"accounts"`
}

var flowData IntegrationFlowData

// TestIntegrationFlow tests the complete hierarchy creation from SYS_ADMIN to WORKER
func TestIntegrationFlow(t *testing.T) {
	if !dbAvailable {
		t.Skip("Database not available, skipping test")
	}

	// Initialize account list
	flowData.Accounts = make([]TestAccount, 0)

	t.Run("Setup: SYS_ADMIN Login", func(t *testing.T) {
		testSysAdminLogin(t)
	})

	t.Run("Step 1: Create Tenant_Alpha", func(t *testing.T) {
		testCreateTenantAlpha(t)
	})

	t.Run("Step 2: BRAND_HQ Login", func(t *testing.T) {
		testBrandHQLogin(t)
	})

	t.Run("Step 3: Create Store_001", func(t *testing.T) {
		testCreateStore001(t)
	})

	t.Run("Step 4: Create STORE_MG User", func(t *testing.T) {
		testCreateStoreMG(t)
	})

	t.Run("Step 5: STORE_MG Login", func(t *testing.T) {
		testStoreMGLogin(t)
	})

	t.Run("Step 6: Create ENG_ORG (MainContractor)", func(t *testing.T) {
		testCreateEngOrg(t)
	})

	t.Run("Step 7: Create ENG_MG User", func(t *testing.T) {
		testCreateEngMG(t)
	})

	t.Run("Step 8: ENG_MG Login", func(t *testing.T) {
		testEngMGLogin(t)
	})

	t.Run("Step 9: Create Supp_A and Supp_B (Vendors)", func(t *testing.T) {
		testCreateVendors(t)
	})

	t.Run("Step 10: Create SUPP_MG Users", func(t *testing.T) {
		testCreateSuppMGs(t)
	})

	t.Run("Step 11: SUPP_MG A Login", func(t *testing.T) {
		testSuppAMGLogin(t)
	})

	t.Run("Step 12: Create WORKER_A", func(t *testing.T) {
		testCreateWorkerA(t)
	})

	t.Run("Step 13: SUPP_MG B Login", func(t *testing.T) {
		testSuppBMGLogin(t)
	})

	t.Run("Step 14: Create WORKER_B", func(t *testing.T) {
		testCreateWorkerB(t)
	})

	t.Run("Step 15: Permission Isolation Tests", func(t *testing.T) {
		testPermissionIsolation(t)
	})

	t.Run("Step 16: Generate Account List", func(t *testing.T) {
		testGenerateAccountList(t)
	})

	t.Run("Step 17: Multi-Tenant User Creation", func(t *testing.T) {
		testMultiTenantUserCreation(t)
	})
}

// testSysAdminLogin logs in as SYS_ADMIN (OWNER role with SYS_ADMIN permissions)
func testSysAdminLogin(t *testing.T) {
	// Try "owner" first, if that fails try "admin"
	payload := map[string]string{
		"username": "owner",
		"password": "admin123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)

	username := "owner"
	if w.Code != http.StatusOK {
		// Try "admin" username
		payload["username"] = "admin"
		w = ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
		username = "admin"
	}

	assert.Equal(t, http.StatusOK, w.Code, "SYS_ADMIN login should succeed")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have data field")

	token, ok := data["token"].(string)
	assert.True(t, ok, "Response should have token")
	assert.NotEmpty(t, token, "Token should not be empty")

	flowData.SysAdminToken = token

	// Get role from response
	role := "OWNER"
	if r, ok := data["role"].(string); ok {
		role = r
	}

	// Record SYS_ADMIN account
	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: username,
		Password: "admin123",
		Role:     role,
		OrgType:  "PLATFORM",
		Email:    username + "@jobmaster.local",
	})
}

// testCreateTenantAlpha creates Tenant_Alpha using SYS_ADMIN token
func testCreateTenantAlpha(t *testing.T) {
	payload := map[string]interface{}{
		"name":             "Tenant_Alpha",
		"admin_email":      "brand_hq@tenantalpha.com",
		"admin_phone":      "13800000001",
		"max_hops":         3,
		"initial_password": "Alpha123456",
	}

	t.Logf("Using SYS_ADMIN token: %s...", flowData.SysAdminToken)

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.SysAdminToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/admin/tenants", payload, headers)
	t.Logf("Create tenant response code: %d, body: %s", w.Code, w.Body.String())
	assert.Equal(t, http.StatusCreated, w.Code, "Create tenant should return 201")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have data field")

	// Extract tenant info
	if tenantData, ok := data["tenant"].(map[string]interface{}); ok {
		if uuid, ok := tenantData["uuid"].(string); ok {
			flowData.TenantID = uuid
		}
		if code, ok := tenantData["code"].(string); ok {
			flowData.TenantCode = code
		}
	}

	assert.NotEmpty(t, flowData.TenantID, "Tenant ID should not be empty")
	assert.NotEmpty(t, flowData.TenantCode, "Tenant code should not be empty")
}

// testBrandHQLogin logs in as BRAND_HQ (the tenant admin created with the tenant)
func testBrandHQLogin(t *testing.T) {
	payload := map[string]string{
		"username": "brand_hq@tenantalpha.com",
		"password": "Alpha123456",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	assert.Equal(t, http.StatusOK, w.Code, "BRAND_HQ login should succeed")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have data field")

	token, ok := data["token"].(string)
	assert.True(t, ok, "Response should have token")
	assert.NotEmpty(t, token, "Token should not be empty")

	flowData.BrandHQToken = token

	// Verify tenant_id matches
	if tenantID, ok := data["tenant_id"].(string); ok {
		assert.Equal(t, flowData.TenantID, tenantID, "Tenant ID should match")
	}

	// Record BRAND_HQ account
	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "brand_hq@tenant_alpha.test",
		Password: "Alpha123456",
		Role:     "BRAND_HQ",
		OrgType:  "HQ",
		Email:    "brand_hq@tenant_alpha.test",
		TenantID: flowData.TenantID,
	})
}

// testCreateStore001 creates Store_001 as a STORE type organization
func testCreateStore001(t *testing.T) {
	payload := map[string]interface{}{
		"name":          "Store_001",
		"type":          "STORE",
		"code":          "STORE_001",
		"contact_name":  "Store Manager",
		"contact_phone": "13800000002",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.BrandHQToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/organizations", payload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create Store_001 should succeed")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	if id, ok := resp["id"].(string); ok {
		flowData.Store001ID = id
	}

	assert.NotEmpty(t, flowData.Store001ID, "Store_001 ID should not be empty")
}

// testCreateStoreMG creates a user with STORE role under Store_001
func testCreateStoreMG(t *testing.T) {
	storeOrgID, err := uuid.Parse(flowData.Store001ID)
	if err != nil {
		t.Fatalf("Failed to parse Store_001 ID: %v", err)
	}

	payload := map[string]interface{}{
		"username":        "store_mg@store001.test",
		"email":           "store_mg@store001.test",
		"phone":           "13800000003",
		"password":        "StoreMG123",
		"role":            "STORE",
		"organization_id": storeOrgID,
		"display_name":    "Store Manager",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.BrandHQToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/users", payload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create STORE_MG should succeed")

	var resp map[string]interface{}
	err = ParseResponse(w, &resp)
	assert.NoError(t, err)

	var userID string
	if id, ok := resp["id"].(string); ok {
		userID = id
	}

	// Record account
	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "store_mg@store001.test",
		Password: "StoreMG123",
		Role:     "STORE",
		OrgType:  "STORE",
		Email:    "store_mg@store001.test",
		UserID:   userID,
		OrgID:    flowData.Store001ID,
		TenantID: flowData.TenantID,
	})
}

// testStoreMGLogin logs in as STORE_MG
func testStoreMGLogin(t *testing.T) {
	payload := map[string]string{
		"username": "store_mg@store001.test",
		"password": "StoreMG123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	assert.Equal(t, http.StatusOK, w.Code, "STORE_MG login should succeed")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have data field")

	token, ok := data["token"].(string)
	assert.True(t, ok, "Response should have token")

	flowData.StoreMGToken = token

	// Verify tenant_id matches
	if tenantID, ok := data["tenant_id"].(string); ok {
		assert.Equal(t, flowData.TenantID, tenantID, "Tenant ID should match")
	}
}

// testCreateEngOrg creates MainContractor organization
func testCreateEngOrg(t *testing.T) {
	// Note: STORE role may not have permission to create MAIN_CONTRACTOR
	// Using BRAND_HQ token instead as per the hierarchy
	payload := map[string]interface{}{
		"name":          "Engineering Company",
		"type":          "MAIN_CONTRACTOR",
		"code":          "ENG_ORG",
		"contact_name":  "Engineering Manager",
		"contact_phone": "13800000004",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.BrandHQToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/organizations", payload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create ENG_ORG should succeed")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	if id, ok := resp["id"].(string); ok {
		flowData.EngOrgID = id
	}

	assert.NotEmpty(t, flowData.EngOrgID, "ENG_ORG ID should not be empty")
}

// testCreateEngMG creates ENG_MG user under ENG_ORG
func testCreateEngMG(t *testing.T) {
	engOrgID, err := uuid.Parse(flowData.EngOrgID)
	if err != nil {
		t.Fatalf("Failed to parse ENG_ORG ID: %v", err)
	}

	payload := map[string]interface{}{
		"username":        "eng_mg@engorg.test",
		"email":           "eng_mg@engorg.test",
		"phone":           "13800000005",
		"password":        "EngMG123",
		"role":            "MAIN_CONTRACTOR",
		"organization_id": engOrgID,
		"display_name":    "Engineering Manager",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.BrandHQToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/users", payload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create ENG_MG should succeed")

	var resp map[string]interface{}
	err = ParseResponse(w, &resp)
	assert.NoError(t, err)

	var userID string
	if id, ok := resp["id"].(string); ok {
		userID = id
	}

	// Record account
	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "eng_mg@engorg.test",
		Password: "EngMG123",
		Role:     "MAIN_CONTRACTOR",
		OrgType:  "MAIN_CONTRACTOR",
		Email:    "eng_mg@engorg.test",
		UserID:   userID,
		OrgID:    flowData.EngOrgID,
		TenantID: flowData.TenantID,
	})
}

// testEngMGLogin logs in as ENG_MG
func testEngMGLogin(t *testing.T) {
	payload := map[string]string{
		"username": "eng_mg@engorg.test",
		"password": "EngMG123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	assert.Equal(t, http.StatusOK, w.Code, "ENG_MG login should succeed")

	var resp map[string]interface{}
	err := ParseResponse(w, &resp)
	assert.NoError(t, err)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have data field")

	token, ok := data["token"].(string)
	assert.True(t, ok, "Response should have token")

	flowData.EngMGToken = token

	// Verify tenant_id matches
	if tenantID, ok := data["tenant_id"].(string); ok {
		assert.Equal(t, flowData.TenantID, tenantID, "Tenant ID should match")
	}
}

// testCreateVendors creates Supp_A and Supp_B vendor organizations
func testCreateVendors(t *testing.T) {
	headers := map[string]string{
		"Authorization": "Bearer " + flowData.EngMGToken,
	}

	// Create Supp_A
	payloadA := map[string]interface{}{
		"name":          "Supplier A",
		"type":          "VENDOR",
		"code":          "SUPP_A",
		"contact_name":  "Supplier A Manager",
		"contact_phone": "13800000006",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/organizations", payloadA, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create Supp_A should succeed")

	var respA map[string]interface{}
	ParseResponse(w, &respA)
	if id, ok := respA["id"].(string); ok {
		flowData.SuppAID = id
	}

	// Create Supp_B
	payloadB := map[string]interface{}{
		"name":          "Supplier B",
		"type":          "VENDOR",
		"code":          "SUPP_B",
		"contact_name":  "Supplier B Manager",
		"contact_phone": "13800000007",
	}

	w = ExecuteRequest(t, "POST", "/api/v1/organizations", payloadB, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create Supp_B should succeed")

	var respB map[string]interface{}
	ParseResponse(w, &respB)
	if id, ok := respB["id"].(string); ok {
		flowData.SuppBID = id
	}

	assert.NotEmpty(t, flowData.SuppAID, "Supp_A ID should not be empty")
	assert.NotEmpty(t, flowData.SuppBID, "Supp_B ID should not be empty")
}

// testCreateSuppMGs creates SUPP_MG users for both vendors
func testCreateSuppMGs(t *testing.T) {
	headers := map[string]string{
		"Authorization": "Bearer " + flowData.EngMGToken,
	}

	suppAID, _ := uuid.Parse(flowData.SuppAID)
	suppBID, _ := uuid.Parse(flowData.SuppBID)

	// Create SUPP_MG for Supp_A
	payloadA := map[string]interface{}{
		"username":        "supp_mg_a@suppa.test",
		"email":           "supp_mg_a@suppa.test",
		"phone":           "13800000008",
		"password":        "SuppMGA123",
		"role":            "VENDOR",
		"organization_id": suppAID,
		"display_name":    "Supplier A Manager",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/users", payloadA, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create SUPP_MG_A should succeed")

	var respA map[string]interface{}
	ParseResponse(w, &respA)
	var userAID string
	if id, ok := respA["id"].(string); ok {
		userAID = id
	}

	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "supp_mg_a@suppa.test",
		Password: "SuppMGA123",
		Role:     "VENDOR",
		OrgType:  "VENDOR",
		Email:    "supp_mg_a@suppa.test",
		UserID:   userAID,
		OrgID:    flowData.SuppAID,
		TenantID: flowData.TenantID,
	})

	// Create SUPP_MG for Supp_B
	payloadB := map[string]interface{}{
		"username":        "supp_mg_b@suppb.test",
		"email":           "supp_mg_b@suppb.test",
		"phone":           "13800000009",
		"password":        "SuppMGB123",
		"role":            "VENDOR",
		"organization_id": suppBID,
		"display_name":    "Supplier B Manager",
	}

	w = ExecuteRequest(t, "POST", "/api/v1/users", payloadB, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create SUPP_MG_B should succeed")

	var respB map[string]interface{}
	ParseResponse(w, &respB)
	var userBID string
	if id, ok := respB["id"].(string); ok {
		userBID = id
	}

	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "supp_mg_b@suppb.test",
		Password: "SuppMGB123",
		Role:     "VENDOR",
		OrgType:  "VENDOR",
		Email:    "supp_mg_b@suppb.test",
		UserID:   userBID,
		OrgID:    flowData.SuppBID,
		TenantID: flowData.TenantID,
	})
}

// testSuppAMGLogin logs in as SUPP_MG_A
func testSuppAMGLogin(t *testing.T) {
	payload := map[string]string{
		"username": "supp_mg_a@suppa.test",
		"password": "SuppMGA123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	assert.Equal(t, http.StatusOK, w.Code, "SUPP_MG_A login should succeed")

	var resp map[string]interface{}
	ParseResponse(w, &resp)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok)

	token, ok := data["token"].(string)
	assert.True(t, ok)

	flowData.SuppAMGToken = token

	// Verify tenant_id matches
	if tenantID, ok := data["tenant_id"].(string); ok {
		assert.Equal(t, flowData.TenantID, tenantID, "Tenant ID should match")
	}
}

// testCreateWorkerA creates WORKER_A under Supp_A
func testCreateWorkerA(t *testing.T) {
	suppAID, _ := uuid.Parse(flowData.SuppAID)

	payload := map[string]interface{}{
		"username":        "worker_a@suppa.test",
		"email":           "worker_a@suppa.test",
		"phone":           "13800000010",
		"password":        "WorkerA123",
		"role":            "ENGINEER",
		"organization_id": suppAID,
		"display_name":    "Worker A",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.SuppAMGToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/users", payload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create WORKER_A should succeed")

	var resp map[string]interface{}
	ParseResponse(w, &resp)

	var userID string
	if id, ok := resp["id"].(string); ok {
		userID = id
		flowData.WorkerAID = id
	}

	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "worker_a@suppa.test",
		Password: "WorkerA123",
		Role:     "ENGINEER",
		OrgType:  "VENDOR",
		Email:    "worker_a@suppa.test",
		UserID:   userID,
		OrgID:    flowData.SuppAID,
		TenantID: flowData.TenantID,
	})
}

// testSuppBMGLogin logs in as SUPP_MG_B
func testSuppBMGLogin(t *testing.T) {
	payload := map[string]string{
		"username": "supp_mg_b@suppb.test",
		"password": "SuppMGB123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)
	assert.Equal(t, http.StatusOK, w.Code, "SUPP_MG_B login should succeed")

	var resp map[string]interface{}
	ParseResponse(w, &resp)

	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok)

	token, ok := data["token"].(string)
	assert.True(t, ok)

	flowData.SuppBMGToken = token

	// Verify tenant_id matches
	if tenantID, ok := data["tenant_id"].(string); ok {
		assert.Equal(t, flowData.TenantID, tenantID, "Tenant ID should match")
	}
}

// testCreateWorkerB creates WORKER_B under Supp_B
func testCreateWorkerB(t *testing.T) {
	suppBID, _ := uuid.Parse(flowData.SuppBID)

	payload := map[string]interface{}{
		"username":        "worker_b@suppb.test",
		"email":           "worker_b@suppb.test",
		"phone":           "13800000011",
		"password":        "WorkerB123",
		"role":            "ENGINEER",
		"organization_id": suppBID,
		"display_name":    "Worker B",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.SuppBMGToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/users", payload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create WORKER_B should succeed")

	var resp map[string]interface{}
	ParseResponse(w, &resp)

	var userID string
	if id, ok := resp["id"].(string); ok {
		userID = id
		flowData.WorkerBID = id
	}

	flowData.Accounts = append(flowData.Accounts, TestAccount{
		Username: "worker_b@suppb.test",
		Password: "WorkerB123",
		Role:     "ENGINEER",
		OrgType:  "VENDOR",
		Email:    "worker_b@suppb.test",
		UserID:   userID,
		OrgID:    flowData.SuppBID,
		TenantID: flowData.TenantID,
	})
}

// testPermissionIsolation tests permission boundaries
func testPermissionIsolation(t *testing.T) {
	t.Run("Cross-Tenant Isolation", func(t *testing.T) {
		// STORE_MG should not be able to access admin endpoints
		headers := map[string]string{
			"Authorization": "Bearer " + flowData.StoreMGToken,
		}

		// Try to list tenants (should fail)
		w := ExecuteRequest(t, "GET", "/api/v1/admin/tenants", nil, headers)
		assert.Equal(t, http.StatusForbidden, w.Code, "STORE_MG should not access tenant list")
	})

	t.Run("Tenant ID Consistency", func(t *testing.T) {
		// Verify all accounts belong to the same tenant
		for _, account := range flowData.Accounts {
			if account.TenantID != "" {
				assert.Equal(t, flowData.TenantID, account.TenantID,
					"Account %s should belong to tenant %s", account.Username, flowData.TenantID)
			}
		}
	})

	t.Run("Role Hierarchy Validation", func(t *testing.T) {
		// STORE should not be able to create BRAND_HQ users
		payload := map[string]interface{}{
			"username":        "test_hq@test.test",
			"email":           "test_hq@test.test",
			"password":        "Test123456",
			"role":            "BRAND_HQ",
			"organization_id": flowData.Store001ID,
			"display_name":    "Test HQ",
		}

		headers := map[string]string{
			"Authorization": "Bearer " + flowData.StoreMGToken,
		}

		w := ExecuteRequest(t, "POST", "/api/v1/users", payload, headers)
		// Should be forbidden or bad request based on permission checks
		assert.True(t, w.Code == http.StatusForbidden || w.Code == http.StatusBadRequest,
			"STORE should not be able to create BRAND_HQ users")
	})
}

// testGenerateAccountList generates the account list markdown file
func testGenerateAccountList(t *testing.T) {
	content := "# Integration Flow Test - Account List\n\n"
	content += fmt.Sprintf("Generated: %s\n\n", time.Now().Format("2006-01-02 15:04:05"))
	content += fmt.Sprintf("Tenant: %s (ID: %s)\n\n", flowData.TenantCode, flowData.TenantID)

	content += "## Account Summary\n\n"
	content += "| Level | Role | Email | Password | Org Type | Org ID | User ID |\n"
	content += "|-------|------|-------|----------|----------|--------|---------|\n"

	for _, account := range flowData.Accounts {
		level := "Platform"
		if account.TenantID != "" {
			if account.Role == "BRAND_HQ" {
				level = "Tenant"
			} else if account.Role == "STORE" {
				level = "Store"
			} else if account.Role == "MAIN_CONTRACTOR" {
				level = "Engineering"
			} else if account.Role == "VENDOR" {
				level = "Vendor"
			} else if account.Role == "ENGINEER" {
				level = "Worker"
			}
		}

		content += fmt.Sprintf("| %s | %s | %s | %s | %s | %s | %s |\n",
			level,
			account.Role,
			account.Email,
			account.Password,
			account.OrgType,
			account.OrgID,
			account.UserID,
		)
	}

	content += "\n## Test Chain Summary\n\n"
	content += fmt.Sprintf("1. **SYS_ADMIN** creates Tenant: %s\n", flowData.TenantCode)
	content += fmt.Sprintf("2. **BRAND_HQ** creates Store: Store_001 (%s)\n", flowData.Store001ID)
	content += fmt.Sprintf("3. **BRAND_HQ** creates Store Manager\n")
	content += fmt.Sprintf("4. **STORE_MG** logs in\n")
	content += fmt.Sprintf("5. **BRAND_HQ** creates Engineering Org: ENG_ORG (%s)\n", flowData.EngOrgID)
	content += fmt.Sprintf("6. **BRAND_HQ** creates ENG_MG\n")
	content += fmt.Sprintf("7. **ENG_MG** creates Supp_A (%s) and Supp_B (%s)\n", flowData.SuppAID, flowData.SuppBID)
	content += fmt.Sprintf("8. **ENG_MG** creates SUPP_MG for both vendors\n")
	content += fmt.Sprintf("9. **SUPP_MG_A** creates WORKER_A (%s)\n", flowData.WorkerAID)
	content += fmt.Sprintf("10. **SUPP_MG_B** creates WORKER_B (%s)\n", flowData.WorkerBID)

	// Write to file
	outputPath := "tests/httptest/account_list.md"
	err := os.WriteFile(outputPath, []byte(content), 0644)
	if err != nil {
		t.Logf("Warning: failed to write account list: %v", err)
	} else {
		t.Logf("Account list written to: %s", outputPath)
	}
}

func testMultiTenantUserCreation(t *testing.T) {
	payload := map[string]interface{}{
		"name":             "Tenant_Beta",
		"admin_email":      "shared_user@example.com",
		"admin_phone":      "13900000000",
		"max_hops":         3,
		"initial_password": "Beta123456",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + flowData.SysAdminToken,
	}

	w := ExecuteRequest(t, "POST", "/api/v1/admin/tenants", payload, headers)
	assert.Equal(t, http.StatusCreated, w.Code, "Create Tenant_Beta should succeed")

	var resp map[string]interface{}
	ParseResponse(w, &resp)

	var betaTenantID string
	if data, ok := resp["data"].(map[string]interface{}); ok {
		if tenantData, ok := data["tenant"].(map[string]interface{}); ok {
			if uuidStr, ok := tenantData["uuid"].(string); ok {
				betaTenantID = uuidStr
			}
		}
	}
	assert.NotEmpty(t, betaTenantID, "Beta tenant ID should not be empty")

	loginPayload := map[string]string{
		"username": "shared_user@example.com",
		"password": "Beta123456",
	}
	w = ExecuteRequest(t, "POST", "/api/v1/auth/login", loginPayload, nil)
	assert.Equal(t, http.StatusOK, w.Code, "Login as Beta BrandHQ should succeed")

	ParseResponse(w, &resp)
	data, _ := resp["data"].(map[string]interface{})
	betaToken, _ := data["token"].(string)

	storePayload := map[string]interface{}{
		"name":          "Store_Beta",
		"type":          "STORE",
		"code":          "STORE_BETA",
		"contact_name":  "Beta Store Manager",
		"contact_phone": "13900000001",
	}
	headers = map[string]string{
		"Authorization": "Bearer " + betaToken,
	}
	w = ExecuteRequest(t, "POST", "/api/v1/organizations", storePayload, headers)
	assert.Equal(t, http.StatusOK, w.Code, "Create Store_Beta should succeed")

	ParseResponse(w, &resp)
	betaStoreID, _ := resp["id"].(string)

	betaStoreUUID, _ := uuid.Parse(betaStoreID)
	userPayload := map[string]interface{}{
		"username":        "store_mg_beta@shared.test",
		"email":           "store_mg@store001.test",
		"phone":           "13900000002",
		"password":        "StoreMGBeta123",
		"role":            "STORE",
		"organization_id": betaStoreUUID,
		"display_name":    "Beta Store Manager (Shared)",
	}

	w = ExecuteRequest(t, "POST", "/api/v1/users", userPayload, headers)

	assert.Equal(t, http.StatusOK, w.Code,
		"Creating user with same email in different tenant should succeed")

	t.Log("Multi-tenant user creation test passed: Same email can exist in different tenants")
}
